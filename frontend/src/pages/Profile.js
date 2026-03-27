import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const Profile = () => {
    const [profileData, setProfileData] = useState(null);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("listings"); // listings | incoming | outgoing
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [profileRes, incomingRes, outgoingRes] = await Promise.all([
                    API.get("/api/users/profile"),
                    API.get("/api/rentals/incoming"),
                    API.get("/api/rentals/outgoing"),
                ]);
                setProfileData(profileRes.data);
                setIncomingRequests(incomingRes.data);
                setOutgoingRequests(outgoingRes.data);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    const handleToggleAvailability = async (id) => {
        try {
            await API.put(`/api/products/${id}/toggle-availability`);
            setProfileData((prev) => ({
                ...prev,
                products: prev.products.map((p) =>
                    p._id === id ? { ...p, available: !p.available } : p
                ),
            }));
        } catch (err) {
            alert("Failed to change availability.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await API.delete(`/api/products/${id}`);
                setProfileData((prev) => ({
                    ...prev,
                    products: prev.products.filter((p) => p._id !== id),
                }));
            } catch (err) {
                alert("Failed to delete product.");
            }
        }
    };

    const handleUpdateRentalStatus = async (rentalId, newStatus) => {
        try {
            await API.put(`/api/rentals/${rentalId}/status`, { status: newStatus });

            // Update local state
            setIncomingRequests((prev) =>
                prev.map((r) => (r._id === rentalId ? { ...r, status: newStatus } : r))
            );

            // If accepted, maybe the product available toggle changed, so we refetch profile products
            if (newStatus === "accepted") {
                const profileRes = await API.get("/api/users/profile");
                setProfileData(profileRes.data);
            }
        } catch (err) {
            alert("Failed to update status");
        }
    };

    if (loading) return <div className="loading">Loading Dashboard...</div>;
    if (!profileData) return <div className="loading">Failed to load profile.</div>;

    const { user, products } = profileData;

    const renderListings = () => (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h3>My Listed Products</h3>
                <button className="add-btn" onClick={() => navigate("/add-product")} style={{ width: "auto", margin: 0 }}>
                    + List New Item
                </button>
            </div>

            {products.length === 0 ? (
                <div className="empty-state">
                    <p>You haven't listed any products yet.</p>
                </div>
            ) : (
                <div className="listing-grid">
                    {products.map((prod) => (
                        <div className="listing-card" key={prod._id}>
                            {prod.image ? (
                                <img src={`http://localhost:5000/uploads/${prod.image}`} alt={prod.name} />
                            ) : (
                                <div className="listing-no-image">No Image</div>
                            )}
                            <div className="listing-info">
                                <h4>{prod.name}</h4>
                                <p className="price">₹{prod.price} <small>/ day</small></p>

                                <div className="listing-actions">
                                    <button
                                        className={`toggle-btn ${!prod.available ? "off" : ""}`}
                                        onClick={() => handleToggleAvailability(prod._id)}
                                    >
                                        {prod.available ? "Available (Hide)" : "Hidden (Show)"}
                                    </button>
                                    <button className="del-btn" onClick={() => handleDelete(prod._id)}>Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    const renderIncoming = () => (
        <>
            <h3>Incoming Rental Requests</h3>
            {incomingRequests.length === 0 ? (
                <div className="empty-state"><p>No incoming requests yet.</p></div>
            ) : (
                <div className="requests-list">
                    {incomingRequests.map(req => (
                        <div className="request-card" key={req._id}>
                            <div className="req-header">
                                <strong>{req.product?.name || "Deleted Product"}</strong>
                                <span className={`status-badge ${req.status}`}>{req.status.toUpperCase()}</span>
                            </div>
                            <div className="req-body">
                                <p><strong>Renter:</strong> {req.renter?.name} ({req.renter?.email})</p>
                                <p><strong>Dates:</strong> {new Date(req.startDate).toLocaleDateString()} to {new Date(req.endDate).toLocaleDateString()}</p>
                                <p><strong>Duration:</strong> {req.totalDays} Days</p>
                                <p><strong>Total Earnings:</strong> ₹{req.totalPrice}</p>
                            </div>
                            {req.status === "pending" && (
                                <div className="req-actions">
                                    <button className="accept-btn" onClick={() => handleUpdateRentalStatus(req._id, "accepted")}>Accept</button>
                                    <button className="reject-btn" onClick={() => handleUpdateRentalStatus(req._id, "rejected")}>Reject</button>
                                </div>
                            )}
                            {req.status === "accepted" && (
                                <div className="req-actions">
                                    <button className="complete-btn" onClick={() => handleUpdateRentalStatus(req._id, "completed")}>Mark as Completed</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    const renderOutgoing = () => (
        <>
            <h3>My Requested Rentals</h3>
            {outgoingRequests.length === 0 ? (
                <div className="empty-state"><p>You haven't made any requests yet.</p></div>
            ) : (
                <div className="requests-list">
                    {outgoingRequests.map(req => (
                        <div className="request-card" key={req._id}>
                            <div className="req-header">
                                <strong>{req.product?.name || "Deleted Product"}</strong>
                                <span className={`status-badge ${req.status}`}>{req.status.toUpperCase()}</span>
                            </div>
                            <div className="req-body">
                                <p><strong>Owner:</strong> {req.owner?.name} ({req.owner?.email})</p>
                                <p><strong>Dates:</strong> {new Date(req.startDate).toLocaleDateString()} to {new Date(req.endDate).toLocaleDateString()}</p>
                                <p><strong>Total Price:</strong> ₹{req.totalPrice}</p>
                            </div>

                            {req.status === "completed" && (
                                <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                                    {reviewForm.rentalId === req._id ? (
                                        <form onSubmit={(e) => submitReview(e, req.product?._id, req._id)} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                                            <label style={{ fontWeight: 600 }}>Rating (1-5)</label>
                                            <select
                                                value={reviewForm.rating}
                                                onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                                                style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border)" }}
                                            >
                                                {[5, 4, 3, 2, 1].map(num => <option key={num} value={num}>{num} Stars</option>)}
                                            </select>

                                            <label style={{ fontWeight: 600 }}>Comment</label>
                                            <textarea
                                                required
                                                value={reviewForm.comment}
                                                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                                placeholder="Write your review..."
                                                style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border)", minHeight: "80px", fontFamily: "inherit" }}
                                            />
                                            <div style={{ display: "flex", gap: "1rem" }}>
                                                <button type="submit" className="accept-btn">Submit Review</button>
                                                <button type="button" className="reject-btn" onClick={() => setReviewForm({ rentalId: null, rating: 5, comment: "" })}>Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <button
                                            className="nav-btn"
                                            style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--primary)", border: "1px solid rgba(16, 185, 129, 0.2)", textAlign: "center", width: "100%" }}
                                            onClick={() => setReviewForm({ rentalId: req._id, rating: 5, comment: "" })}
                                        >
                                            ★ Leave a Review
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    return (
        <div className="profile-container">
            <div className="profile-sidebar">
                <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
                <h2>{user.name}</h2>
                <p className="email">{user.email}</p>

                <div className="sidebar-nav">
                    <button
                        className={`nav-btn ${activeTab === "listings" ? "active" : ""}`}
                        onClick={() => setActiveTab("listings")}
                    >
                        My Listings ({products.length})
                    </button>
                    <button
                        className={`nav-btn ${activeTab === "incoming" ? "active" : ""}`}
                        onClick={() => setActiveTab("incoming")}
                    >
                        Incoming Requests ({incomingRequests.filter(r => r.status === "pending").length} Pending)
                    </button>
                    <button
                        className={`nav-btn ${activeTab === "outgoing" ? "active" : ""}`}
                        onClick={() => setActiveTab("outgoing")}
                    >
                        My Rentals ({outgoingRequests.length})
                    </button>
                </div>
            </div>

            <div className="profile-main">
                {activeTab === "listings" && renderListings()}
                {activeTab === "incoming" && renderIncoming()}
                {activeTab === "outgoing" && renderOutgoing()}
            </div>
        </div>
    );
};

export default Profile;
