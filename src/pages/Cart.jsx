import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaMinus, FaPlus, FaTrash, FaChevronLeft, FaUndo } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../api/axios";
import {
  getGuestCart,
  updateGuestCartQuantity,
  removeFromGuestCart,
} from "../utils/guestCart";
import { notifyCartUpdated } from "../utils/cartEvents";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/cart.css";

const SERVER_ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");

const resolveImageSrc = (imageUrl) => {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${SERVER_ORIGIN}${imageUrl}`;
};

export default function Cart() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyRow, setBusyRow] = useState(null);
  // Guests (no token yet) see a cart built from localStorage instead of
  // the database. It gets merged into their real cart on login/signup.
  const [isGuest, setIsGuest] = useState(!localStorage.getItem("token"));

  const formatPrice = (amount) =>
    `Rs. ${Number(amount).toLocaleString("en-US")}`;

  // Guest-cart items don't have a real cart_id (nothing's been saved to the
  // database yet), so we key/reference them by product_id instead. Giving
  // them a `cart_id` field too means the JSX below can stay identical for
  // both guest and logged-in carts.
  const loadGuestCart = () => {
    const guestItems = getGuestCart().map((it) => ({
      ...it,
      cart_id: it.product_id,
    }));
    setItems(guestItems);
    setLoading(false);
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/cart");
      if (res.data.success) setItems(res.data.items);
    } catch (err) {
      console.error("Failed to load cart:", err);
      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }
      setError("Could not load your cart. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsGuest(true);
      loadGuestCart();
      return;
    }
    setIsGuest(false);
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateQuantity = async (cartItem, nextQuantity) => {
    if (nextQuantity < 1 || nextQuantity > Number(cartItem.stock)) return;

    setItems((prev) =>
      prev.map((it) =>
        it.cart_id === cartItem.cart_id ? { ...it, quantity: nextQuantity } : it
      )
    );

    if (isGuest) {
      updateGuestCartQuantity(cartItem.product_id, nextQuantity);
      return;
    }

    setBusyRow(cartItem.cart_id);
    try {
      await api.put(`/cart/${cartItem.cart_id}`, { quantity: nextQuantity });
      notifyCartUpdated();
    } catch (err) {
      console.error("Failed to update quantity:", err);
      setItems((prev) =>
        prev.map((it) =>
          it.cart_id === cartItem.cart_id ? { ...it, quantity: cartItem.quantity } : it
        )
      );
      toast.error(err.response?.data?.message || "Could not update quantity");
    } finally {
      setBusyRow(null);
    }
  };

  const removeItem = async (cartItem) => {
    const previousItems = items;
    setItems((prev) => prev.filter((it) => it.cart_id !== cartItem.cart_id));

    if (isGuest) {
      removeFromGuestCart(cartItem.product_id);
      toast.success("Item removed from cart");
      return;
    }

    try {
      await api.delete(`/cart/${cartItem.cart_id}`);
      notifyCartUpdated();
      toast.success("Item removed from cart");
    } catch (err) {
      console.error("Failed to remove item:", err);
      setItems(previousItems);
      toast.error(err.response?.data?.message || "Could not remove item");
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (isGuest) {
      // Cart items are only saved locally for guests — an account (and
      // the merge that happens right after login/signup) is required
      // before we can actually place an order.
      navigate("/login", { state: { mode: "signup", from: "checkout" } });
      return;
    }
    navigate("/checkout");
  };

  return (
    <div className="cart-page">
      <Navbar />

      <div className="cart-header">
        <div>
          <h1>Your Shopping Cart</h1>
          <p>Review your items and head to checkout when you're ready.</p>
        </div>
        <span className="cart-continue" onClick={() => navigate("/shop")}>
          <FaChevronLeft /> Continue Shopping
        </span>
      </div>

      {isGuest && items.length > 0 && (
        <p className="cart-status" style={{ padding: "0 2rem" }}>
          You're not signed in — these items are saved on this device.{" "}
          <span
            className="cart-help-link"
            onClick={() => navigate("/login", { state: { mode: "signup", from: "cart" } })}
          >
            Sign in or create an account
          </span>{" "}
          to check out.
        </p>
      )}

      <div className="cart-layout">
        {/* ---------- Items ---------- */}
        <div className="cart-items">
          {loading ? (
            <p className="cart-status">Loading your cart...</p>
          ) : error ? (
            <p className="cart-status">{error}</p>
          ) : items.length === 0 ? (
            <div className="cart-empty">
              <p>Your cart is empty.</p>
              <button onClick={() => navigate("/shop")}>Continue Shopping</button>
            </div>
          ) : (
            items.map((item) => {
              const outOfStock = Number(item.stock) <= 0;
              const lineTotal = Number(item.price) * item.quantity;
              const rowBusy = busyRow === item.cart_id;

              return (
                <div className="cart-card" key={item.cart_id}>
                  <div className="cart-card-image">
                    {item.image_url ? (
                      <img src={resolveImageSrc(item.image_url)} alt={item.name} />
                    ) : (
                      <div className="cart-card-noimage">No Image</div>
                    )}
                  </div>

                  <div className="cart-card-body">
                    <h4>{item.name}</h4>
                    <span className={`cart-stock-pill ${outOfStock ? "out" : ""}`}>
                      {outOfStock ? "Out of Stock" : "In Stock"}
                    </span>
                  </div>

                  <div className="cart-card-price">
                    <p className="cart-line-total">{formatPrice(lineTotal)}</p>
                    <p className="cart-each">{formatPrice(item.price)} each</p>
                  </div>

                  <div className="cart-qty-control">
                    <button
                      onClick={() => updateQuantity(item, item.quantity - 1)}
                      disabled={rowBusy || item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <FaMinus />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item, item.quantity + 1)}
                      disabled={rowBusy || item.quantity >= Number(item.stock)}
                      aria-label="Increase quantity"
                    >
                      <FaPlus />
                    </button>
                  </div>

                  <button
                    className="cart-remove-btn"
                    onClick={() => removeItem(item)}
                    aria-label="Remove item"
                  >
                    <FaTrash />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ---------- Order summary ---------- */}
        {!loading && !error && items.length > 0 && (
          <aside className="cart-summary">
            <h3>Order Summary</h3>

            <div className="cart-summary-row">
              <span>Subtotal ({totalItems} items)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="cart-summary-row">
              <span>Estimated Shipping</span>
              <span className="cart-free">FREE</span>
            </div>

            <div className="cart-summary-total">
              <span>Total</span>
              <div>
                <p className="cart-total-amount">{formatPrice(subtotal)}</p>
              </div>
            </div>

            <button
              className="cart-checkout-btn"
              onClick={handleCheckout}
            >
              Proceed to Checkout →
            </button>

            <div className="cart-trust-row">
              <span><FaUndo /> Easy Returns</span>
            </div>

            <p className="cart-help">
              Need help with your order? Visit our{" "}
              <span className="cart-help-link" onClick={() => navigate("/contact")}>
                Help Center
              </span>{" "}
              or call us at +977 1-4444444
            </p>
          </aside>
        )}
      </div>

      <Footer />
    </div>
  );
}