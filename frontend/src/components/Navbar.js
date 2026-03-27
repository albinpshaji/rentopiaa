import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);

  // Check login status on mount and listen for storage changes
  useEffect(() => {
    const checkLogin = () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const storedAdmin = JSON.parse(localStorage.getItem("admin"));
      setUser(storedUser);
      setAdmin(storedAdmin);
    };

    checkLogin();
    window.addEventListener("storage", checkLogin);

    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("admin");
    localStorage.removeItem("token");
    setUser(null);
    setAdmin(null);
    navigate("/");
  };

  return (
    <nav>
      <div className="logo">RENTOPIAA</div>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/products">Browse Products</Link>
        </li>

        {/* Add Product visible only if user is logged in */}
        {user && (
          <li>
            <Link to="/add-product">Add Product</Link>
          </li>
        )}

        {/* Show greeting + Logout if logged in */}
        {(user || admin) ? (
          <>
            <li style={{ color: "#ffd166", fontWeight: 600 }}>
              {user ? `Hi, ${user.name}` : `Admin: ${admin.username}`}
            </li>
            <li>
              <button onClick={handleLogout} style={styles.logoutBtn}>
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login">User Login</Link>
            </li>
            <li>
              <Link to="/register">Register</Link>
            </li>
            <li>
              <Link to="/admin">Admin Login</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

const styles = {
  logoutBtn: {
    backgroundColor: "#dc3545",
    border: "none",
    padding: "5px 10px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    borderRadius: "6px",
  },
};

export default Navbar;
