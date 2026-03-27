import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api";
import "./RentProduct.css";

const RentProduct = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await API.get("/api/products");
        const prod = res.data.find((p) => p._id === id);
        setProduct(prod);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProduct();
  }, [id]);

  if (!product) return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>;

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

      <div className="rent-contact">
        <p>Contact the owner to rent this product.</p>
        <a href={`tel:${product.ownerNumber}`}>
          📞 {product.ownerNumber}
        </a>
      </div>
    </div>
  );
};

export default RentProduct;
