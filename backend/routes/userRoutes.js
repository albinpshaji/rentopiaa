import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { verifyUser } from "../middleware/auth.js";

const router = express.Router();

// Register user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const userObj = { _id: user._id, name: user.name, email: user.email };
    res.json({ message: "User registered successfully", user: userObj });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// User login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRES_IN || "7d" }
    );

    const userObj = { _id: user._id, name: user.name, email: user.email };
    res.json({ message: "Login successful", user: userObj, token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get User Profile & Listed Products
router.get("/profile", verifyUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const products = await Product.find({ userId: user._id });

    res.json({ user, products });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching profile", error: err.message });
  }
});

export default router;
