import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  deposit: { type: Number, required: true },
  description: String,
  image: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ownerNumber: { type: String, required: true },
  available: { type: Boolean, default: true },
  place: { type: String, required: true },
});

export default mongoose.model("Product", productSchema);
