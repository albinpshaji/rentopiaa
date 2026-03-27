import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./ProductList.css";

const ProductList = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [placeSearch, setPlaceSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);

  // Fetch logged-in user/admin
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedAdmin = JSON.parse(localStorage.getItem("admin"));
    setUser(storedUser);
    setAdmin(storedAdmin);
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await API.get("/api/products");
        setProducts(res.data);
        setFilteredProducts(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching products:", err);
        setLoading(false);
      }
    };
    fetchProducts();
  }, [user, admin]);

  // Filter logic
  useEffect(() => {
    let result = products;

    if (search.trim() !== "") {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (placeSearch.trim() !== "") {
      result = result.filter((p) =>
        p.place && p.place.toLowerCase().includes(placeSearch.toLowerCase())
      );
    }

    if (categoryFilter !== "All") {
      result = result.filter((p) => p.category === categoryFilter);
    }

    setFilteredProducts(result);
  }, [search, placeSearch, categoryFilter, products]);

  // Delete product
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await API.delete(`/api/products/${id}`);
        setProducts(products.filter((p) => p._id !== id));
      } catch (err) {
        console.error("Error deleting product:", err);
        alert("Failed to delete product. Try again.");
      }
    }
  };

  // Toggle availability
  const handleToggleAvailability = async (id) => {
    try {
      await API.put(`/api/products/${id}/toggle-availability`);

      setProducts(
        products.map((p) =>
          p._id === id ? { ...p, available: !p.available } : p
        )
      );
    } catch (err) {
      console.error("Error toggling availability:", err);
      alert("Failed to change availability. Please try again.");
    }
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="product-list-container">
      <h2>Available Products</h2>

      {/* Filter controls */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <input
          type="text"
          placeholder="Search by place..."
          value={placeSearch}
          onChange={(e) => setPlaceSearch(e.target.value)}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Sports">Sports</option>
          <option value="Gadgets">Gadgets</option>
          <option value="Furniture">Furniture</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Product Grid */}
      <div className="product-grid">
        {filteredProducts.length === 0 ? (
          <p>No products found.</p>
        ) : (
          filteredProducts.map((prod) => (
            <div className="product-card" key={prod._id}>
              <div className="image-container">
                {prod.image ? (
                  <img
                    src={`http://localhost:5000/uploads/${prod.image}`}
                    alt={prod.name}
                    className="product-image"
                  />
                ) : (
                  <div className="no-image">No Image</div>
                )}
              </div>

              <div className="detail-row">
                <span className="badge">{prod.category}</span>
                <span className="badge" style={{ background: "var(--surface-hover)", color: "var(--text-muted)", border: "none" }}>📍 {prod.place}</span>
              </div>

              <h3>{prod.name}</h3>
              <div className="price-tag">₹{prod.price} <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: "normal" }}>/ day</span></div>
              <div className="deposit-tag">Deposit: ₹{prod.deposit}</div>

              <p className="desc-text">{prod.description}</p>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button
                  className="rent-btn"
                  onClick={() => {
                    if (user) {
                      navigate(`/rent/${prod._id}`);
                    } else {
                      navigate("/login");
                    }
                  }}
                >
                  Rent Now
                </button>

                {(admin || (user && prod.userId?.toString() === user._id)) && (
                  <>
                    <button
                      className={`availability-btn ${!prod.available ? "is-unavailable" : ""}`}
                      onClick={() => handleToggleAvailability(prod._id)}
                    >
                      {prod.available ? "Make Unavailable" : "Make Available"}
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(prod._id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductList;
