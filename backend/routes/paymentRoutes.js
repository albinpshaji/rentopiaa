import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import Rental from "../models/Rental.js";
import { verifyUser } from "../middleware/auth.js";

const router = express.Router();

// Initialize Razorpay instance lazily to ensure process.env is loaded
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

// 1. Create a Razorpay Order for a rental
router.post("/create-order", verifyUser, async (req, res) => {
    try {
        const rzp = getRazorpay();
        if (!rzp) {
            return res.status(503).json({ message: "Payment service not configured. Ask the admin to add Razorpay API keys." });
        }

        const { rentalId } = req.body;

        const rental = await Rental.findById(rentalId);
        if (!rental) return res.status(404).json({ message: "Rental not found" });

        // Only the renter can pay
        if (rental.renter.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the renter can make the payment" });
        }

        // Can only pay for accepted rentals
        if (rental.status !== "accepted") {
            return res.status(400).json({ message: "Payment is only available for accepted rentals" });
        }

        // Don't allow double payment
        if (rental.paymentStatus === "paid") {
            return res.status(400).json({ message: "This rental has already been paid for" });
        }

        // Create Razorpay order (amount is in paise — ₹1 = 100 paise)
        const order = await rzp.orders.create({
            amount: Math.round(rental.totalPrice * 100),
            currency: "INR",
            receipt: `rental_${rental._id}`,
        });

        // Save the order ID on the rental
        rental.razorpayOrderId = order.id;
        await rental.save();

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error("Razorpay create-order error:", err);
        res.status(500).json({ message: "Failed to create payment order", error: err.message });
    }
});

// 2. Verify payment after Razorpay checkout
router.post("/verify", verifyUser, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Verify the payment signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Payment verification failed — invalid signature" });
        }

        // Find the rental by the Razorpay order ID and update payment status
        const rental = await Rental.findOne({ razorpayOrderId: razorpay_order_id });
        if (!rental) {
            return res.status(404).json({ message: "Rental not found for this payment" });
        }

        rental.razorpayPaymentId = razorpay_payment_id;
        rental.paymentStatus = "paid";
        await rental.save();

        res.json({ message: "Payment verified successfully!", rental });
    } catch (err) {
        console.error("Payment verify error:", err);
        res.status(500).json({ message: "Payment verification failed", error: err.message });
    }
});

export default router;
