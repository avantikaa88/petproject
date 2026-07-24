import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api/axios";
import { addToGuestCart } from "../utils/guestCart";
import { notifyCartUpdated } from "../utils/cartEvents";

// Uploaded product images are stored as relative paths like "/uploads/xyz.png"
// and served from the backend's root (not /api). This turns that into a full URL.
const SERVER_ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");

const resolveImageSrc = (product) => {
  // Real products from the database use `image_url` (e.g. "/uploads/xyz.png").
  if (product.image_url) {
    if (/^https?:\/\//i.test(product.image_url)) return product.image_url;
    return `${SERVER_ORIGIN}${product.image_url}`;
  }
  // Home page's hardcoded demo favorites use a plain `image` field (full URL).
  if (product.image) return product.image;
  return "/images/p1.webp";
};

function ProductCard({ product }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null); // null | "adding" | "added"

  const outOfStock = Number(product.stock) <= 0;

  const handleAddToCart = async (e) => {
    // Don't let this click also trigger the card's navigate-to-product-detail.
    e.stopPropagation();

    if (outOfStock) return;

    const token = localStorage.getItem("token");
    if (!token) {
      // Not logged in yet — keep the item in a local guest cart instead of
      // losing it. It'll be merged into their real cart once they sign in
      // or create an account (see AuthContainer + utils/guestCart.js).
      setStatus("adding");
      addToGuestCart(product, 1);
      setStatus("added");
      toast.success("Added to cart!");
      setTimeout(() => setStatus(null), 1500);
      return;
    }

    setStatus("adding");
    try {
      await api.post("/cart", { product_id: product.product_id, quantity: 1 });
      setStatus("added");
      notifyCartUpdated();
      toast.success("Added to cart!");
      setTimeout(() => setStatus(null), 1500);
    } catch (err) {
      console.error("Failed to add to cart:", err);
      setStatus(null);
      toast.error(err.response?.data?.message || "Could not add item to cart");
    }
  };

  const handleOpenProduct = () => {
    if (!product.product_id) {
      // Some hardcoded/demo cards don't have a real database id — there's
      // nowhere valid to navigate to, so just do nothing instead of
      // sending the user to a broken "/product/undefined" page.
      return;
    }
    navigate(`/product/${product.product_id}`);
  };

  return (
    <div
      className="product-card"
      onClick={handleOpenProduct}
      style={{ cursor: "pointer" }}
    >
      <div className="product-card-image">
        {outOfStock && <span className="product-card-badge-out">Out of Stock</span>}
        <img
          src={resolveImageSrc(product)}
          alt={product.name}
          onError={(e) => {
            e.target.src = "/images/p1.webp";
          }}
        />
      </div>

      <h3>{product.name}</h3>
      <p>NPR {product.price}</p>

      <button onClick={handleAddToCart} disabled={outOfStock || status === "adding"}>
        {outOfStock
          ? "Out of Stock"
          : status === "adding"
          ? "Adding..."
          : status === "added"
          ? "Added!"
          : "Add To Cart"}
      </button>
    </div>
  );
}

export default ProductCard;