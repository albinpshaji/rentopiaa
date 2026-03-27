import React, { useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import "./ProductAdd.css";

const ProductAdd = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [ownerNumber, setOwnerNumber] = useState("");
  const [place, setPlace] = useState("");
  const [error, setError] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));

  const categories = ["Electronics", "Sports", "Gadgets", "Furniture", "Other"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to add a product");
      return;
    }

    // Validate phone number
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(ownerNumber)) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    if (!place.trim()) {
      alert("Please enter the product location/place");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    formData.append("price", price);
    formData.append("deposit", deposit);
    formData.append("description", description);
    formData.append("ownerNumber", ownerNumber);
    formData.append("place", place);
    formData.append("userId", user._id);
    if (image) formData.append("image", image);

    try {
      await API.post("/api/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Product added successfully");
      navigate("/products");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to add product");
    }
  };

  return (
    <div className="container">
      <h2>Add New Product</h2>
      {error && <p className="error">{error}</p>}

      <form className="product-form" onSubmit={handleSubmit}>
        <label>Name:</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />

        <label>Category:</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          {categories.map((c, idx) => (
            <option key={idx} value={c}>{c}</option>
          ))}
        </select>

        <label>Price (₹):</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />

        <label>Deposit (₹):</label>
        <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} required />

        <label>Description:</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />

        <label>Place / Location:</label>
        <input
          type="text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Enter product location (e.g., Kochi, Chennai)"
          required
        />

        <label>Owner Phone Number:</label>
        <input
          type="text"
          value={ownerNumber}
          onChange={(e) => setOwnerNumber(e.target.value)}
          placeholder="Enter your 10-digit phone number"
          required
        />

        <label>Image:</label>
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />

        <button type="submit" className="add-btn">Add Product</button>
      </form>
    </div>
  );
};

export default ProductAdd;
