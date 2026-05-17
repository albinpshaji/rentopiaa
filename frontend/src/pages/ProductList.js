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
      <div className="product-list-header">
        <h2>Available Products</h2>
        <p>Find what you need or list what you have.</p>
      </div>

      {/* Unified Search Bar */}
      <div className="search-bar-unified">
        <div className="search-field">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="What are you looking for?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="search-divider"></div>
        
        <div className="search-field">
          <span className="search-icon">📍</span>
          <input
            type="text"
            placeholder="Where?"
            value={placeSearch}
            onChange={(e) => setPlaceSearch(e.target.value)}
          />
        </div>

        <div className="search-divider"></div>
        
        <div className="search-field">
          <span className="search-icon">🏷️</span>
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
      </div>

      {/* Product Grid */}
      <div className="product-grid">
        {filteredProducts.length === 0 ? (
          <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)" }}>
            No products found matching your search.
          </p>
        ) : (
          filteredProducts.map((prod) => (
            <div className="product-card" key={prod._id}>

              <div className="image-container">
                <span className="category-badge">{prod.category}</span>
                <span className="place-badge">📍 {prod.place}</span>
                {prod.image ? (
                  <img
                    src={`http://localhost:5000/uploads/${prod.image}`}
                    alt={prod.name}
                    className="product-image"
                  />
                ) : (
                  <div className="no-image">No Image Provided</div>
                )}
              </div>

              <div className="card-content">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3>{prod.name}</h3>
                  {prod.reviewCount > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.9rem", color: "#f59e0b", fontWeight: "700", background: "#fffbeb", padding: "2px 8px", borderRadius: "12px" }}>
                      ★ {prod.rating.toFixed(1)} <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "500" }}>({prod.reviewCount})</span>
                    </div>
                  )}
                </div>

                <div className="price-container">
                  <span className="price-tag">₹{prod.price}</span>
                  <span className="price-sub">/ day</span>
                </div>

                <div>
                  <span className="deposit-tag">Deposit: ₹{prod.deposit}</span>
                </div>

                <p className="desc-text">{prod.description}</p>

                {/* Action Buttons */}
                <div className="action-buttons">
                  {!(user && prod.userId?.toString() === user._id) ? (
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
                  ) : (
                    <div style={{ color: "var(--primary)", fontWeight: "bold", alignSelf: "center", marginRight: "auto" }}>
                      Your Item
                    </div>
                  )}

                  {(admin || (user && prod.userId?.toString() === user._id)) && (
                    <div className="admin-actions">
                      <button
                        className={`availability-btn ${!prod.available ? "is-unavailable" : ""}`}
                        onClick={() => handleToggleAvailability(prod._id)}
                      >
                        {prod.available ? "Hide" : "Show"}
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(prod._id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductList;
