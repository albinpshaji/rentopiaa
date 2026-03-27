import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../models/Product.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// __dirname setup for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Get all products
router.get("/", optionalAuth, async (req, res) => {
  try {
    let products = await Product.find();

    if (req.admin) {
      // Admin sees all products
    } else if (req.user) {
      products = products.filter(
        (p) => p.available || p.userId.toString() === req.user._id.toString()
      );
    } else {
      products = products.filter((p) => p.available);
    }

    res.json(products);
  } catch (err) {
    console.error("Error in GET /products:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// Add product
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, category, price, deposit, description, userId, ownerNumber, place } = req.body;
    if (!userId || !ownerNumber || !place) {
      return res.status(401).json({ message: "All fields including place are required" });
    }

    const product = new Product({
      name,
      category,
      price,
      deposit,
      description,
      image: req.file ? req.file.filename : null,
      userId,
      ownerNumber,
      place,
    });

    await product.save();
    res.json(product);
  } catch (err) {
    console.error("Error in POST /products:", err);
    res.status(500).json({ message: "Failed to add product" });
  }
});

// Delete product
router.delete("/:id", optionalAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (req.admin) {
      await product.deleteOne();
      return res.json({ message: "Product deleted by admin successfully" });
    }

    if (req.user) {
      if (product.userId.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "You can only delete your own products" });

      await product.deleteOne();
      return res.json({ message: "Product deleted successfully" });
    }

    res.status(401).json({ message: "Unauthorized: user or admin required" });
  } catch (err) {
    console.error("Error in DELETE /products/:id:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Toggle availability
router.put("/:id/toggle-availability", optionalAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (req.user) {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You can only update your own products" });
      }
    } else if (!req.admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    product.available = !product.available;
    await product.save();

    res.json({
      message: `Product is now ${product.available ? "available" : "unavailable"}`,
      product,
    });
  } catch (err) {
    console.error("Error in PUT /products/:id/toggle-availability:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
