import express from "express";
import Review from "../models/Review.js";
import Rental from "../models/Rental.js";
import Product from "../models/Product.js";
import { verifyUser } from "../middleware/auth.js";

const router = express.Router();

// 1. Create a Review (Renter only, for completed rentals)
router.post("/", verifyUser, async (req, res) => {
    try {
        const { productId, rentalId, rating, comment } = req.body;

        // Verify the rental exists and is completed
        const rental = await Rental.findById(rentalId);
        if (!rental) return res.status(404).json({ message: "Rental not found" });

        if (rental.status !== "completed") {
            return res.status(400).json({ message: "You can only review completed rentals" });
        }

        if (rental.renter.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the renter can leave a review" });
        }

        // Check if user already reviewed this rental
        const existingReview = await Review.findOne({ rental: rentalId, reviewer: req.user._id });
        if (existingReview) {
            return res.status(400).json({ message: "You have already reviewed this rental" });
        }

        // Create review
        const review = new Review({
            product: productId,
            rental: rentalId,
            reviewer: req.user._id,
            rating,
            comment
        });

        await review.save();

        // Update Product average rating
        const product = await Product.findById(productId);
        if (product) {
            const allReviews = await Review.find({ product: productId });
            const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

            product.rating = avgRating;
            product.reviewCount = allReviews.length;
            await product.save();
        }

        res.status(201).json({ message: "Review posted successfully!", review });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// 2. Get reviews for a specific product
router.get("/product/:productId", async (req, res) => {
    try {
        const reviews = await Review.find({ product: req.params.productId })
            .populate("reviewer", "name")
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

export default router;
