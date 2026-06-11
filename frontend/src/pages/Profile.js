import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import { API_URL } from "../config";
import "./Profile.css";

const Profile = () => {
    const [profileData, setProfileData] = useState(null);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("listings"); // listings | incoming | outgoing
    const [reviewForm, setReviewForm] = useState({ rentalId: null, rating: 5, comment: "" });
    const [incomingFilter, setIncomingFilter] = useState("all");
    const [outgoingFilter, setOutgoingFilter] = useState("all");
    const [openChatRentalId, setOpenChatRentalId] = useState(null);
    const navigate = useNavigate();

    // Sort requests by status priority: pending first, then accepted, completed, rejected last
    const statusOrder = { pending: 0, accepted: 1, completed: 2, rejected: 3 };
    const sortByStatus = (a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);

    const submitReview = async (e, productId, rentalId) => {
        e.preventDefault();
        try {
            const res = await API.post("/api/reviews", {
                productId,
                rentalId,
                rating: reviewForm.rating,
                comment: reviewForm.comment,
            });
            alert(res.data.message);
            setReviewForm({ rentalId: null, rating: 5, comment: "" });

            // Bug 6 Fix: Refetch outgoing requests so the review button updates
            const outgoingRes = await API.get("/api/rentals/outgoing");
            setOutgoingRequests(outgoingRes.data);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to submit review.");
        }
    };

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

            // Refetch both incoming requests (to reflect auto-rejections) and profile data
            const [incomingRes, profileRes] = await Promise.all([
                API.get("/api/rentals/incoming"),
                API.get("/api/users/profile"),
            ]);
            setIncomingRequests(incomingRes.data);
            setProfileData(profileRes.data);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update status");
        }
    };

    // Missing 1: Cancel a pending rental request
    const handleCancelRequest = async (rentalId) => {
        if (!window.confirm("Are you sure you want to cancel this rental request?")) return;
        try {
            await API.delete(`/api/rentals/${rentalId}/cancel`);
            setOutgoingRequests((prev) => prev.filter((r) => r._id !== rentalId));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to cancel request");
        }
    };

    // Razorpay payment handler
    const handlePayment = async (rentalId) => {
        try {
            // 1. Create a Razorpay order on the backend
            const { data } = await API.post("/api/payments/create-order", { rentalId });

            // 2. Open Razorpay checkout popup
            const options = {
                key: data.keyId,
                amount: data.amount,
                currency: data.currency,
                name: "Rentopiaa",
                description: "Rental Payment",
                order_id: data.orderId,
                handler: async (response) => {
                    // 3. Verify payment on the backend
                    try {
                        const verifyRes = await API.post("/api/payments/verify", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        alert(verifyRes.data.message);

                        // 4. Update local state to reflect payment
                        setOutgoingRequests((prev) =>
                            prev.map((r) =>
                                r._id === rentalId ? { ...r, paymentStatus: "paid" } : r
                            )
                        );
                    } catch (err) {
                        alert(err.response?.data?.message || "Payment verification failed");
                    }
                },
                prefill: {
                    name: profileData?.user?.name || "",
                    email: profileData?.user?.email || "",
                },
                theme: {
                    color: "#10b981",
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to initiate payment");
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
                                <img src={`${API_URL}/uploads/${prod.image}`} alt={prod.name} />
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

    const renderIncoming = () => {
        const filtered = incomingRequests
            .filter(r => incomingFilter === "all" || r.status === incomingFilter)
            .sort(sortByStatus);

        return (
            <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                    <h3 style={{ margin: 0 }}>Incoming Rental Requests</h3>
                    <select
                        value={incomingFilter}
                        onChange={(e) => setIncomingFilter(e.target.value)}
                        style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.9rem" }}
                    >
                        <option value="all">All ({incomingRequests.length})</option>
                        <option value="pending">Pending ({incomingRequests.filter(r => r.status === "pending").length})</option>
                        <option value="accepted">Accepted ({incomingRequests.filter(r => r.status === "accepted").length})</option>
                        <option value="completed">Completed ({incomingRequests.filter(r => r.status === "completed").length})</option>
                        <option value="rejected">Rejected ({incomingRequests.filter(r => r.status === "rejected").length})</option>
                    </select>
                </div>
                {filtered.length === 0 ? (
                    <div className="empty-state"><p>{incomingRequests.length === 0 ? "No incoming requests yet." : "No requests match this filter."}</p></div>
                ) : (
                    <div className="requests-list">
                        {filtered.map(req => (
                            <div className="request-card" key={req._id}>
                                <div className="req-header">
                                    <strong>{req.product?.name || "Deleted Product"}</strong>
                                    <span className={`status-badge ${req.status}`}>{req.status.toUpperCase()}</span>
                                </div>
                                <div className="req-body">
                                    <p><strong>Renter:</strong> {req.renter?.name} ({req.renter?.email})</p>
                                    <p><strong>Dates:</strong> {new Date(req.startDate).toLocaleDateString()} to {new Date(req.endDate).toLocaleDateString()}</p>
                                    <p><strong>Duration:</strong> {req.totalDays} Days</p>
                                    <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid var(--border)", padding: "0.8rem", borderRadius: "8px", marginTop: "0.5rem" }}>
                                        <p style={{ margin: "0 0 0.3rem 0", fontSize: "0.9rem" }}><strong>Rental Fee:</strong> ₹{req.rentalFee || req.totalPrice}</p>
                                        <p style={{ margin: "0 0 0.3rem 0", fontSize: "0.9rem" }}><strong>Deposit:</strong> ₹{req.depositAmount || 0} {req.depositRefunded ? <span style={{color: "var(--primary)"}}>(Refunded)</span> : ""}</p>
                                        <p style={{ margin: 0, fontWeight: 700, color: "var(--primary)" }}>Total Earned: ₹{req.rentalFee || req.totalPrice}</p>
                                    </div>
                                    {req.paymentStatus && req.paymentStatus !== "pending" && (
                                        <p style={{
                                            marginTop: "0.5rem", padding: "0.4rem 0.8rem", borderRadius: "8px", display: "inline-block",
                                            fontWeight: 700, fontSize: "0.85rem",
                                            background: req.paymentStatus === "paid" ? "rgba(16, 185, 129, 0.15)" : "#fef2f2",
                                            color: req.paymentStatus === "paid" ? "var(--primary)" : "#ef4444",
                                        }}>
                                            {req.paymentStatus === "paid" ? "✅ Payment Received" : "↩️ Refunded"}
                                        </p>
                                    )}
                                </div>
                                {req.status === "pending" && (
                                    <div className="req-actions">
                                        <button className="accept-btn" onClick={() => handleUpdateRentalStatus(req._id, "accepted")}>Accept</button>
                                        <button className="reject-btn" onClick={() => handleUpdateRentalStatus(req._id, "rejected")}>Reject</button>
                                    </div>
                                )}
                                {(req.status === "accepted" || req.status === "completed") && (
                                    <div className="req-actions">
                                        {req.status === "accepted" && (
                                            <button className="complete-btn" onClick={() => handleUpdateRentalStatus(req._id, "completed")}>Mark as Completed</button>
                                        )}
                                        <button
                                            className="nav-btn"
                                            style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--primary)", border: "1px solid rgba(16, 185, 129, 0.2)" }}
                                            onClick={() => setOpenChatRentalId(openChatRentalId === req._id ? null : req._id)}
                                        >
                                            {openChatRentalId === req._id ? "Close Chat" : "💬 Open Chat"}
                                        </button>
                                    </div>
                                )}
                                {openChatRentalId === req._id && (
                                    <ChatBox rentalId={req._id} onClose={() => setOpenChatRentalId(null)} />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </>
        );
    };

    const renderOutgoing = () => {
        const filtered = outgoingRequests
            .filter(r => outgoingFilter === "all" || r.status === outgoingFilter)
            .sort(sortByStatus);

        return (
            <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                    <h3 style={{ margin: 0 }}>My Requested Rentals</h3>
                    <select
                        value={outgoingFilter}
                        onChange={(e) => setOutgoingFilter(e.target.value)}
                        style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.9rem" }}
                    >
                        <option value="all">All ({outgoingRequests.length})</option>
                        <option value="pending">Pending ({outgoingRequests.filter(r => r.status === "pending").length})</option>
                        <option value="accepted">Accepted ({outgoingRequests.filter(r => r.status === "accepted").length})</option>
                        <option value="completed">Completed ({outgoingRequests.filter(r => r.status === "completed").length})</option>
                        <option value="rejected">Rejected ({outgoingRequests.filter(r => r.status === "rejected").length})</option>
                    </select>
                </div>
                {filtered.length === 0 ? (
                    <div className="empty-state"><p>{outgoingRequests.length === 0 ? "You haven't made any requests yet." : "No requests match this filter."}</p></div>
                ) : (
                <div className="requests-list">
                    {filtered.map(req => (
                        <div className="request-card" key={req._id}>
                            <div className="req-header">
                                <strong>{req.product?.name || "Deleted Product"}</strong>
                                <span className={`status-badge ${req.status}`}>{req.status.toUpperCase()}</span>
                            </div>
                            <div className="req-body">
                                <p><strong>Owner:</strong> {req.owner?.name} ({req.owner?.email})</p>
                                <p><strong>Dates:</strong> {new Date(req.startDate).toLocaleDateString()} to {new Date(req.endDate).toLocaleDateString()}</p>
                                <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid var(--border)", padding: "0.8rem", borderRadius: "8px", marginTop: "0.5rem" }}>
                                    <p style={{ margin: "0 0 0.3rem 0", fontSize: "0.9rem" }}><strong>Rental Fee:</strong> ₹{req.rentalFee || req.totalPrice}</p>
                                    <p style={{ margin: "0 0 0.3rem 0", fontSize: "0.9rem" }}><strong>Deposit:</strong> ₹{req.depositAmount || 0} {req.depositRefunded ? <span style={{color: "var(--primary)"}}>(Refunded)</span> : "(Refundable)"}</p>
                                    <p style={{ margin: 0, fontWeight: 700, color: "var(--text-main)" }}>Total Price: ₹{req.totalPrice}</p>
                                </div>

                                {/* Missing 2: Show owner contact info when rental is accepted or completed */}
                                {(req.status === "accepted" || req.status === "completed") && req.product?.ownerNumber && (
                                    <p style={{ marginTop: "0.5rem", padding: "0.5rem 0.8rem", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                                        <strong>📞 Owner Contact:</strong> {req.product.ownerNumber}
                                    </p>
                                )}
                            </div>

                            {/* Cancel button for pending requests */}
                            {req.status === "pending" && (
                                <div className="req-actions">
                                    <button className="reject-btn" onClick={() => handleCancelRequest(req._id)}>Cancel Request</button>
                                </div>
                            )}

                            {/* Chat button for accepted/completed requests */}
                            {(req.status === "accepted" || req.status === "completed") && (
                                <div className="req-actions" style={{ flexWrap: "wrap" }}>
                                    {/* Pay Now button for accepted + unpaid */}
                                    {req.status === "accepted" && req.paymentStatus !== "paid" && (
                                        <button
                                            className="accept-btn"
                                            style={{ flex: 1 }}
                                            onClick={() => handlePayment(req._id)}
                                        >
                                            💳 Pay Now — ₹{req.totalPrice} (inc. ₹{req.depositAmount || 0} deposit)
                                        </button>
                                    )}
                                    {/* Paid badge */}
                                    {req.paymentStatus === "paid" && (
                                        <span style={{
                                            padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 700,
                                            background: "rgba(16, 185, 129, 0.15)", color: "var(--primary)",
                                            fontSize: "0.9rem", flex: 1, textAlign: "center"
                                        }}>
                                            ✅ Paid
                                        </span>
                                    )}
                                    <button
                                        className="nav-btn"
                                        style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--primary)", border: "1px solid rgba(16, 185, 129, 0.2)", flex: 1, textAlign: "center" }}
                                        onClick={() => setOpenChatRentalId(openChatRentalId === req._id ? null : req._id)}
                                    >
                                        {openChatRentalId === req._id ? "Close Chat" : "💬 Open Chat"}
                                    </button>
                                </div>
                            )}
                            {openChatRentalId === req._id && (
                                <ChatBox rentalId={req._id} onClose={() => setOpenChatRentalId(null)} />
                            )}

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
    };

    const renderAnalytics = () => {
        let totalRevenue = 0;
        let activeRentals = 0;
        let completedRentals = 0;
        const itemStats = {};

        // Compute stats from incoming requests
        incomingRequests.forEach(req => {
            const isCompleted = req.status === "completed";
            const isPaid = req.paymentStatus === "paid";
            const isAccepted = req.status === "accepted";
            
            if (isCompleted || isPaid) {
                totalRevenue += req.totalPrice;
            }
            if (isAccepted) activeRentals++;
            if (isCompleted) completedRentals++;

            // Performance by item
            const prodId = req.product?._id;
            const prodName = req.product?.name || "Deleted Product";
            
            if (prodId) {
                if (!itemStats[prodId]) {
                    itemStats[prodId] = { name: prodName, requests: 0, rented: 0, earned: 0 };
                }
                itemStats[prodId].requests++;
                if (isAccepted || isCompleted) {
                    itemStats[prodId].rented++;
                }
                if (isCompleted || isPaid) {
                    itemStats[prodId].earned += req.totalPrice;
                }
            }
        });

        const sortedItems = Object.values(itemStats).sort((a, b) => b.earned - a.earned);

        return (
            <div className="analytics-container">
                <h3 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem", color: "var(--text-main)" }}>Owner Analytics</h3>
                
                <div className="analytics-grid">
                    <div className="analytics-card">
                        <div className="analytics-icon">💰</div>
                        <div className="analytics-info">
                            <h4>Total Revenue</h4>
                            <p>₹{totalRevenue}</p>
                        </div>
                    </div>
                    <div className="analytics-card">
                        <div className="analytics-icon">📦</div>
                        <div className="analytics-info">
                            <h4>Active Rentals</h4>
                            <p>{activeRentals} Items</p>
                        </div>
                    </div>
                    <div className="analytics-card">
                        <div className="analytics-icon">✅</div>
                        <div className="analytics-info">
                            <h4>Completed Rentals</h4>
                            <p>{completedRentals} Times</p>
                        </div>
                    </div>
                </div>

                <div className="analytics-table-container">
                    <h4 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-main)" }}>Performance by Item</h4>
                    {sortedItems.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No rental data available yet.</p>
                    ) : (
                        <table className="analytics-table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Times Requested</th>
                                    <th>Times Rented</th>
                                    <th>Total Earned</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                                        <td>{item.requests}</td>
                                        <td>{item.rented}</td>
                                        <td style={{ color: "var(--primary)", fontWeight: 700 }}>₹{item.earned}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    };

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
                    <button
                        className={`nav-btn ${activeTab === "analytics" ? "active" : ""}`}
                        onClick={() => setActiveTab("analytics")}
                        style={{ marginTop: "1rem" }}
                    >
                        📊 Analytics
                    </button>
                </div>
            </div>

            <div className="profile-main">
                {activeTab === "listings" && renderListings()}
                {activeTab === "incoming" && renderIncoming()}
                {activeTab === "outgoing" && renderOutgoing()}
                {activeTab === "analytics" && renderAnalytics()}
            </div>
        </div>
    );
};

export default Profile;
