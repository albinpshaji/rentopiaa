import express from "express";
import Rental from "../models/Rental.js";
import Product from "../models/Product.js";
import { verifyUser } from "../middleware/auth.js";

const router = express.Router();

// 1. Create a Rental Request (Renter)
router.post("/request", verifyUser, async (req, res) => {
    try {
        const { productId, startDate, endDate, totalDays, totalPrice } = req.body;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        // Ensure the renter isn't renting their own product
        if (product.userId.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot rent your own product" });
        }

        if (!product.available) {
            return res.status(400).json({ message: "This product is currently unavailable" });
        }

        const rental = new Rental({
            product: productId,
            renter: req.user._id,
            owner: product.userId, // Product owner
            startDate,
            endDate,
            totalDays,
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
            .populate("product")
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

        // If accepted, mark the product as unavailable
        if (status === "accepted") {
            const product = await Product.findById(rental.product);
            if (product) {
                product.available = false;
                await product.save();
            }
        }

        res.json({ message: `Rental request marked as ${status}`, rental });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

export default router;
