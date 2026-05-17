import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import "./RentProduct.css";

const RentProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);

  // Booking state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalDays, setTotalDays] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchProductAndReviews = async () => {
      try {
        const [prodRes, revRes] = await Promise.all([
          API.get("/api/products"),
          API.get(`/api/reviews/product/${id}`)
        ]);
        const prod = prodRes.data.find((p) => p._id === id);
        setProduct(prod);
        setReviews(revRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchProductAndReviews();
  }, [id]);

  // Calculate total price dynamically
  useEffect(() => {
    if (startDate && endDate && product) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        setTotalDays(diffDays);
        setTotalPrice(diffDays * product.price);
      } else {
        setTotalDays(0);
        setTotalPrice(0);
      }
    }
  }, [startDate, endDate, product]);

  const handleBook = async (e) => {
    e.preventDefault();

    if (totalDays <= 0) {
      return alert("End date must be after the start date.");
    }

    setLoading(true);
    try {
      const res = await API.post("/api/rentals/request", {
        productId: product._id,
        startDate,
        endDate,
        totalDays,
        totalPrice,
      });

      alert(res.data.message);
      navigate("/profile"); // Redirect to dashboard to see outgoing requests
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send rental request.");
    } finally {
      setLoading(false);
    }
  };

  if (!product) return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>;

  // Get today's date in YYYY-MM-DD format for min attributes
  const today = new Date().toISOString().split("T")[0];
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
  const isOwner = loggedInUser && product.userId === loggedInUser._id;

  return (
    <div className="rent-product-container">
      <h2>Rent {product.name}</h2>

      {product.image && (
        <img
          src={`http://localhost:5000/uploads/${product.image}`}
          alt={product.name}
          className="rent-product-image"
        />
      )}

      <div className="rent-details-grid">
        <p><strong>Category</strong> <span className="badge">{product.category}</span></p>
        <p><strong>Price</strong> <span className="price-tag" style={{ margin: 0, fontSize: "1.3rem" }}>₹{product.price}</span> / day</p>
        <p><strong>Deposit</strong> ₹{product.deposit}</p>
        <p><strong>Location</strong> 📍 {product.place}</p>
      </div>

      <p className="rent-description">{product.description}</p>

      {/* Booking Form */}
      {isOwner ? (
        <div className="booking-section" style={{ textAlign: "center", padding: "2rem" }}>
          <h3 style={{ color: "var(--primary)" }}>This is your product!</h3>
          <p style={{ color: "var(--text-muted)" }}>You cannot request to rent your own item.</p>
        </div>
      ) : (
        <div className="booking-section">
          <h3>Request to Rent</h3>
          <form onSubmit={handleBook} className="booking-form">
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="booking-summary">
              <div className="summary-row">
                <span>Duration:</span>
                <span>{totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
              </div>
              <div className="summary-row">
                <span>Rate:</span>
                <span>₹{product.price} / day</span>
              </div>
              <div className="summary-row total">
                <span>Total Rental Price:</span>
                <span>₹{totalPrice}</span>
              </div>
              <p className="deposit-note">
                Note: A ₹{product.deposit} deposit must be paid upon pickup.
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", padding: "1rem", fontSize: "1.1rem" }}
              disabled={loading || totalDays <= 0 || !product.available}
            >
              {loading ? "Sending Request..." : !product.available ? "Currently Unavailable" : "Send Rental Request"}
            </button>
          </form>
        </div>
      )}

      {/* Reviews Section */}
      <div className="reviews-section" style={{ marginTop: "3rem" }}>
        <h3 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "1.5rem" }}>
          Reviews {product.reviewCount > 0 && <span style={{ color: "#f59e0b", fontSize: "1.4rem" }}>★ {product.rating.toFixed(1)}</span>}
        </h3>

        {reviews.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic", background: "var(--surface)", padding: "1.5rem", borderRadius: "12px", border: "1px dashed var(--border)" }}>
            No reviews yet. Rent this item and be the first to leave a review!
          </p>
        ) : (
          <div className="reviews-grid" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {reviews.map((rev) => (
              <div key={rev._id} className="review-card" style={{ background: "var(--surface)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <strong style={{ color: "var(--text-main)", fontSize: "1.1rem" }}>
                    {rev.reviewer?.name || "Anonymous User"}
                  </strong>
                  <span style={{ color: "#f59e0b", fontWeight: 800 }}>
                    {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                  </span>
                </div>
                <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{rev.comment}</p>
                <div style={{ marginTop: "0.8rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {new Date(rev.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default RentProduct;
