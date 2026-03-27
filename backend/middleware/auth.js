import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

// Verify JWT token and attach user to request
export const verifyUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Access denied. No token provided." });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "user") {
            return res.status(403).json({ message: "Access denied. User token required." });
        }

        const user = await User.findById(decoded.id).select("-password");
        if (!user) return res.status(401).json({ message: "User not found." });

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token." });
    }
};

// Verify JWT token and attach admin to request
export const verifyAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Access denied. No token provided." });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "admin") {
            return res.status(403).json({ message: "Access denied. Admin token required." });
        }

        const admin = await Admin.findById(decoded.id).select("-password");
        if (!admin) return res.status(401).json({ message: "Admin not found." });

        req.admin = admin;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token." });
    }
};

// Optional auth — attaches user/admin if token present, but doesn't block
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role === "user") {
            const user = await User.findById(decoded.id).select("-password");
            if (user) req.user = user;
        } else if (decoded.role === "admin") {
            const admin = await Admin.findById(decoded.id).select("-password");
            if (admin) req.admin = admin;
        }

        next();
    } catch (err) {
        // Token invalid — continue as unauthenticated
        next();
    }
};
