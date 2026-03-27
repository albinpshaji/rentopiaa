import React, { useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("/api/admin/login", { username, password });

      alert(res.data.message);

      // Store logged-in admin info and token
      localStorage.setItem("admin", JSON.stringify(res.data.admin));
      localStorage.setItem("token", res.data.token);

      // Trigger storage event so Navbar updates
      window.dispatchEvent(new Event("storage"));

      // Redirect to product page
      navigate("/products");
    } catch (err) {
      alert(err.response?.data?.message || "Admin login failed");
    }
  };

  return (
    <div className="login-container">
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <label>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="login-btn">
          Login
        </button>
      </form>
      <div className="back-link">
        <a href="/">← Back to Home</a>
      </div>
    </div>
  );
};

export default AdminLogin;
