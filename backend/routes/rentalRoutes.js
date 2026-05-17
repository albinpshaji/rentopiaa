import express from "express";
import Razorpay from "razorpay";
import Rental from "../models/Rental.js";
import Product from "../models/Product.js";
import { verifyUser } from "../middleware/auth.js";

const router = express.Router();

// Initialize Razorpay for refunds lazily
let razorpayInstance = null;
const getRazorpay = () => {
    if (razorpayInstance) return razorpayInstance;
    if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes("REPLACE")) {
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        return razorpayInstance;
    }
    return null;
};

// 1. Create a Rental Request (Renter)
router.post("/request", verifyUser, async (req, res) => {
    try {
        const { productId, startDate, endDate } = req.body;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        // Ensure the renter isn't renting their own product
        if (product.userId.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot rent your own product" });
        }

        // Bug 4 Fix: Calculate price on the server, don't trust frontend values
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end - start;
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (totalDays <= 0) {
            return res.status(400).json({ message: "End date must be after start date" });
        }

        // Bug Fix: Check for date overlapping instead of global availability
        const overlappingRentals = await Rental.find({
            product: productId,
            status: "accepted",
            $or: [
                { startDate: { $lte: end }, endDate: { $gte: start } }
            ]
        });

        if (overlappingRentals.length > 0) {
            return res.status(400).json({ message: "This product is already booked for the selected dates" });
        }

        // Bug 3 Fix: Prevent duplicate pending requests from the same user for overlapping dates
        const existingRequest = await Rental.findOne({
            product: productId,
            renter: req.user._id,
            status: "pending",
            $or: [
                { startDate: { $lte: end }, endDate: { $gte: start } }
            ]
        });
        if (existingRequest) {
            return res.status(400).json({ message: "You already have a pending request for these dates" });
        }

        // Security Deposit Fix: Charge Rental Fee + Deposit
        const rentalFee = totalDays * product.price;
        const depositAmount = product.deposit || 0;
        const totalPrice = rentalFee + depositAmount;

        const rental = new Rental({
            product: productId,
            renter: req.user._id,
            owner: product.userId,
            startDate: start,
            endDate: end,
            totalDays,
            rentalFee,
            depositAmount,
            totalPrice,
            status: "pending",
        });

        await rental.save();
        res.status(201).json({ message: "Rental request sent to the owner!", rental });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// 2. Get incoming requests for products I own (Owner)
router.get("/incoming", verifyUser, async (req, res) => {
    try {
        const requests = await Rental.find({ owner: req.user._id })
            .populate("product")
            .populate("renter", "name email") // Don't send password
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// 3. Get my outgoing requests for products I want to rent (Renter)
router.get("/outgoing", verifyUser, async (req, res) => {
    try {
        const requests = await Rental.find({ renter: req.user._id })
            .populate("product", "name image price ownerNumber") // Include ownerNumber for accepted rentals
            .populate("owner", "name email")
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// 4. Update Rental Status (Owner accepting/rejecting)
router.put("/:id/status", verifyUser, async (req, res) => {
    try {
        const { status } = req.body; // 'accepted', 'rejected', 'completed'

        // Validate status
        if (!["accepted", "rejected", "completed"].includes(status)) {
            return res.status(400).json({ message: "Invalid status update" });
        }

        const rental = await Rental.findById(req.params.id);
        if (!rental) return res.status(404).json({ message: "Rental request not found" });

        // Security check: Only the owner of the product can do this
        if (rental.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to update this status" });
        }

        rental.status = status;
        await rental.save();

        // If accepted, auto-reject other overlapping pending requests
        if (status === "accepted") {
            // Bug 2 Fix: Auto-reject only overlapping pending requests for this product
            await Rental.updateMany(
                {
                    product: rental.product,
                    _id: { $ne: rental._id },
                    status: "pending",
                    $or: [
                        { startDate: { $lte: rental.endDate }, endDate: { $gte: rental.startDate } }
                    ]
                },
                { status: "rejected" }
            );
        }

        // Bug 1 Fix & Security Deposit Fix
        if (status === "completed") {
            // When completed, automatically refund the deposit to the renter
            const rzp = getRazorpay();
            if (rental.paymentStatus === "paid" && rental.razorpayPaymentId && rental.depositAmount > 0 && rzp && !rental.depositRefunded) {
                try {
                    await rzp.payments.refund(rental.razorpayPaymentId, {
                        amount: Math.round(rental.depositAmount * 100), // Refund only the deposit in paise
                    });
                    rental.depositRefunded = true;
                    // Keep paymentStatus as "paid" because the rental fee was kept
                    await rental.save();
                } catch (refundErr) {
                    console.error("Deposit refund failed:", refundErr);
                }
            }
        }

        // Refund: If rejected and payment was made, process a refund
        const rzp = getRazorpay();
        if (status === "rejected" && rental.paymentStatus === "paid" && rental.razorpayPaymentId && rzp) {
            try {
                await rzp.payments.refund(rental.razorpayPaymentId, {
                    amount: Math.round(rental.totalPrice * 100), // Full refund in paise
                });
                rental.paymentStatus = "refunded";
                await rental.save();
            } catch (refundErr) {
                console.error("Refund failed:", refundErr);
                // Still reject the rental, but log the refund failure
            }
        }

        res.json({ message: `Rental request marked as ${status}`, rental });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// 5. Cancel a Rental Request (Renter cancels their own pending request)
router.delete("/:id/cancel", verifyUser, async (req, res) => {
    try {
        const rental = await Rental.findById(req.params.id);
        if (!rental) return res.status(404).json({ message: "Rental request not found" });

        // Only the renter who created the request can cancel it
        if (rental.renter.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only cancel your own requests" });
        }

        // Can only cancel pending requests
        if (rental.status !== "pending") {
            return res.status(400).json({ message: `Cannot cancel a request that is already ${rental.status}` });
        }

        await rental.deleteOne();
        res.json({ message: "Rental request cancelled successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

export default router;
