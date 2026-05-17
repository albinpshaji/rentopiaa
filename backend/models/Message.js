import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    rental: { type: mongoose.Schema.Types.ObjectId, ref: "Rental", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Message", messageSchema);
