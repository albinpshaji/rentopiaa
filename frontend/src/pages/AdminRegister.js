import React, { useState } from "react";
import API from "../api";

const AdminRegister = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      alert("Username and password required");
      return;
    }

    try {
      const res = await API.post("/api/admin/register", { username, password });

      alert(res.data.message);
      window.location.href = "/admin";
    } catch (err) {
      alert(err.response?.data?.message || "Admin registration failed");
    }
  };

  return (
    <div className="register-container">
      <h2>Admin Registration</h2>
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

        <button type="submit">Register Admin</button>
      </form>
      <div className="footer">
        Already have an admin account? <a href="/admin">Login here</a>
      </div>
    </div>
  );
};

export default AdminRegister;
