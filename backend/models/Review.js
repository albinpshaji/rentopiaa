import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    rental: { type: mongoose.Schema.Types.ObjectId, ref: "Rental", required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

// Ensure a user can only review a specific rental once
reviewSchema.index({ rental: 1, reviewer: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
