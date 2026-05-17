import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

// Load env vars BEFORE any route imports (routes use process.env at import time)
dotenv.config();

import connectDB from "./config/db.js";

// Route imports
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import rentalRoutes from "./routes/rentalRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

// __dirname setup for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
connectDB();

// Initialize Express
const app = express();

// Create HTTP server and attach Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

// Make io accessible to route handlers via req.app.get("io")
app.set("io", io);

// Socket.IO connection handling
io.on("connection", (socket) => {
    // When a user opens a chat, they join a room specific to that rental
    socket.on("joinRental", (rentalId) => {
        socket.join(`rental_${rentalId}`);
    });

    // When a user closes a chat, they leave the room
    socket.on("leaveRental", (rentalId) => {
        socket.leave(`rental_${rentalId}`);
    });

    socket.on("disconnect", () => {
        // Cleanup handled automatically by Socket.IO
    });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount routes
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payments", paymentRoutes);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
