import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaSearch, FaShoppingCart, FaChevronDown } from "react-icons/fa";
import api from "../api/axios";
import { getGuestCartCount } from "../utils/guestCart";
import { CART_UPDATED_EVENT } from "../utils/cartEvents";
import "../styles/navbar.css";

function Navbar({
  categories,
  selectedCategories = [],
  onCategoryToggle,
  onClearCategories,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef(null);

  // The Shop page passes down its own product-derived category list (and
  // handlers to filter in place). Every other page renders without those
  // props, so the navbar fetches the full category list itself — that way
  // "Categories" shows up no matter where you are, not just on Shop.
  const [fetchedCategories, setFetchedCategories] = useState([]);
  const isInteractive = typeof onCategoryToggle === "function";
  const displayCategories = categories ?? fetchedCategories;

  useEffect(() => {
    if (categories !== undefined) return; // Shop already supplied its own list
    let cancelled = false;
    api
      .get("/categories")
      .then((res) => {
        if (!cancelled && res.data.success) {
          setFetchedCategories(res.data.categories.map((c) => c.name));
        }
      })
      .catch((err) => console.error("Failed to load categories:", err));
    return () => {
      cancelled = true;
    };
  }, [categories]);

  // On any page other than Shop, picking a category jumps to Shop
  // pre-filtered by it, since there's no local product list to filter here.
  const handleCategoryClick = (category) => {
    if (isInteractive) {
      onCategoryToggle(category);
      return;
    }
    setCategoryMenuOpen(false);
    navigate(`/shop?category=${encodeURIComponent(category)}`);
  };

  // Close the category dropdown when clicking anywhere outside of it.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(e.target)
      ) {
        setCategoryMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

        {displayCategories.length > 0 && (
          <li className="nav-dropdown" ref={categoryMenuRef}>
            <span
              className="nav-dropdown-toggle"
              onClick={() => setCategoryMenuOpen((prev) => !prev)}
            >
              Categories <FaChevronDown className="nav-dropdown-caret" />
            </span>

            {categoryMenuOpen && (
              <div className="nav-dropdown-menu">
                {displayCategories.map((category) =>
                  isInteractive ? (
                    <label className="nav-dropdown-item" key={category}>
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => handleCategoryClick(category)}
                      />
                      {category}
                    </label>
                  ) : (
                    <button
                      type="button"
                      className="nav-dropdown-item nav-dropdown-link"
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                    >
                      {category}
                    </button>
                  )
                )}
                {isInteractive && selectedCategories.length > 0 && (
                  <button
                    type="button"
                    className="nav-dropdown-clear"
                    onClick={() => onClearCategories?.()}
                  >
                    Clear categories
                  </button>
                )}
              </div>
            )}
          </li>
        )}

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