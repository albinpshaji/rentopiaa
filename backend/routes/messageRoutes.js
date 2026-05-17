import express from "express";
import Message from "../models/Message.js";
import Rental from "../models/Rental.js";
import { verifyUser } from "../middleware/auth.js";

const router = express.Router();

// Helper: Check if user is part of this rental
const getRentalIfAuthorized = async (rentalId, userId) => {
    const rental = await Rental.findById(rentalId);
    if (!rental) return null;

    const isRenter = rental.renter.toString() === userId.toString();
    const isOwner = rental.owner.toString() === userId.toString();

    if (!isRenter && !isOwner) return null;
    if (!["accepted", "completed"].includes(rental.status)) return null;

    return rental;
};

// GET /api/messages/:rentalId — Fetch all messages for a rental conversation
router.get("/:rentalId", verifyUser, async (req, res) => {
    try {
        const rental = await getRentalIfAuthorized(req.params.rentalId, req.user._id);
        if (!rental) {
            return res.status(403).json({ message: "You are not authorized to view these messages" });
        }

        const messages = await Message.find({ rental: req.params.rentalId })
            .populate("sender", "name")
            .sort({ createdAt: 1 }); // Oldest first

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// POST /api/messages/:rentalId — Send a new message
router.post("/:rentalId", verifyUser, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Message cannot be empty" });
        }

        const rental = await getRentalIfAuthorized(req.params.rentalId, req.user._id);
        if (!rental) {
            return res.status(403).json({ message: "You are not authorized to send messages here" });
        }

        const message = new Message({
            rental: req.params.rentalId,
            sender: req.user._id,
            text: text.trim(),
        });

        await message.save();

        // Populate sender name before returning
        await message.populate("sender", "name");

        // Emit via Socket.IO if available
        const io = req.app.get("io");
        if (io) {
            io.to(`rental_${req.params.rentalId}`).emit("newMessage", message);
        }

        res.status(201).json(message);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

export default router;
