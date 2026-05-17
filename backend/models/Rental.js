import mongoose from "mongoose";

const rentalSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    renter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    rentalFee: { type: Number, required: true },
    depositAmount: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    depositRefunded: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "completed"],
        default: "pending",
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "refunded"],
        default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Rental", rentalSchema);
