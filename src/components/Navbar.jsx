import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaSearch, FaShoppingCart } from "react-icons/fa";
import api from "../api/axios";
import { getGuestCartCount } from "../utils/guestCart";
import { CART_UPDATED_EVENT } from "../utils/cartEvents";
import "../styles/navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Logged in if we have a token saved from a previous login/register
  const token = localStorage.getItem("token");
  const isLoggedIn = !!token;
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const [cartCount, setCartCount] = useState(0);

  // Guests get their count from localStorage instantly; logged-in users
  // get it from their real (database) cart. Wrapped in useCallback so the
  // effects below can safely depend on it without re-running every render.
  const refreshCartCount = useCallback(async () => {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      setCartCount(getGuestCartCount());
      return;
    }

    try {
      const res = await api.get("/cart");
      if (res.data.success) {
        const count = res.data.items.reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0
        );
        setCartCount(count);
      }
    } catch (err) {
      console.error("Failed to load cart count:", err);
    }
  }, []);

  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount, location.pathname]);

  useEffect(() => {
    // Covers: adding/updating/removing items from Shop, ProductDetail,
    // and the Cart page itself, plus the guest cart merging into a real
    // account right after login/signup.
    window.addEventListener(CART_UPDATED_EVENT, refreshCartCount);
    return () => window.removeEventListener(CART_UPDATED_EVENT, refreshCartCount);
  }, [refreshCartCount]);

  const handleAuthClick = () => {
    if (isLoggedIn) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    } else {
      navigate("/login");
    }
  };

  // Logged-in users should always land back on their own dashboard when
  // they click "Home" — whether they're currently on Shop, Contact, or
  // anywhere else. Admins go to the admin panel, everyone else to /user.
  // Only a logged-out visitor goes to the public homepage.
  const handleHomeClick = () => {
    if (isLoggedIn && user?.role === "admin") {
      navigate("/admin");
    } else if (isLoggedIn) {
      navigate("/user");
    } else {
      navigate("/");
    }
  };

  return (
    <nav className="navbar">
      <div className="logo"> PawShop</div>

      <ul className="nav-links">
        <li onClick={handleHomeClick}>Home</li>
        <li onClick={() => navigate("/shop")}>Shop</li>
         <li onClick={() => navigate("/contact")}>Contact</li>
        
      </ul>

      <div className="search-area">
        <FaSearch className="icon" />
        <input placeholder="Search for products..." />
      </div>

      <div className="nav-icons">
        <div
          className="cart-icon-wrapper"
          onClick={() => navigate("/cart")}
          role="button"
          aria-label="View cart"
        >
          <FaShoppingCart className="icon" />
          {cartCount > 0 && (
            <span className="cart-badge">{cartCount > 99 ? "99+" : cartCount}</span>
          )}
        </div>

        {isLoggedIn && (
          <button onClick={handleAuthClick}>
            Sign Out
          </button>
        )}

        {!isLoggedIn && (
          <>
            <button
              className="signup-btn"
              onClick={() => navigate("/login", { state: { mode: "signup" } })}
            >
              Sign Up
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;