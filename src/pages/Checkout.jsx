import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaTruck,
  FaCreditCard,
  FaShieldAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../api/axios";
import { notifyCartUpdated } from "../utils/cartEvents";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/checkout.css";

const SERVER_ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");

const resolveImageSrc = (imageUrl) => {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${SERVER_ORIGIN}${imageUrl}`;
};

const PAYMENT_OPTIONS = [
  {
    key: "khalti",
    label: "Khalti",
    tag: "KHALTI",
  },
  {
    key: "cod",
    label: "Cash on Delivery",
  },
];
export default function Checkout() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  const [shippingSaved, setShippingSaved] = useState(false);
  const [shippingErrors, setShippingErrors] = useState({});
  const [shipping, setShipping] = useState({
    full_name: "",
    phone_number: "",
    city: "",
    tole: "",
    detailed_address: "",
  });

const [paymentMethod, setPaymentMethod] = useState("cod");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const loadCart = async () => {
      try {
        setLoading(true);
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

    // Prefill the shipping form with whatever the user already entered
    // when they signed up (name, phone, address), so they don't have to
    // retype it every time they check out.
    const loadProfile = async () => {
      try {
        const res = await api.get("/auth/profile");
        if (res.data.success) {
          const profileUser = res.data.user;
          const [tolePart = "", cityPart = ""] = (profileUser.address || "")
            .split(",")
            .map((part) => part.trim());

          const filled = {
            full_name: profileUser.full_name || "",
            phone_number: profileUser.phone_number || "",
            city: cityPart,
            tole: tolePart,
            detailed_address: profileUser.address || "",
          };

          setShipping((prev) => ({
            full_name: prev.full_name || filled.full_name,
            phone_number: prev.phone_number || filled.phone_number,
            city: prev.city || filled.city,
            tole: prev.tole || filled.tole,
            detailed_address: prev.detailed_address || filled.detailed_address,
          }));

          // If the profile already has everything the form requires,
          // mark shipping as saved so the user isn't forced to click
          // "Save & Continue" just to re-confirm data they already gave us.
          if (filled.full_name && filled.phone_number && filled.city && filled.tole) {
            setShippingSaved(true);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };

    loadCart();
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatPrice = (amount) =>
    `Rs. ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items]
  );
  const total = subtotal;

  const handleShippingChange = (field, value) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveShipping = (e) => {
    e.preventDefault();
    const errors = {};
    if (!shipping.full_name.trim()) errors.full_name = true;
    if (!shipping.phone_number.trim()) errors.phone_number = true;
    if (!shipping.city.trim()) errors.city = true;
    if (!shipping.tole.trim()) errors.tole = true;

    setShippingErrors(errors);
    if (Object.keys(errors).length > 0) {
      setShippingSaved(false);
      return;
    }
    setShippingSaved(true);
  };

  const buildShippingAddressText = () => {
    const paymentLabel =
      PAYMENT_OPTIONS.find((p) => p.key === paymentMethod)?.label || "";
    return [
      shipping.full_name,
      shipping.phone_number,
      `${shipping.tole}, ${shipping.city}`,
      shipping.detailed_address,
      `Payment Method: ${paymentLabel}`,
    ]
      .filter(Boolean)
      .join(" | ");
  };

 const handlePlaceOrder = async () => {
  if (!shippingSaved) {
    toast.error("Please fill in and save your shipping address first.");
    return;
  }

  if (items.length === 0) {
    toast.error("Your cart is empty.");
    return;
  }

  setPlacingOrder(true);

  try {
    console.log("Payment:", paymentMethod);

    const res = await api.post("/orders", {
      shipping_address: buildShippingAddressText(),
      payment_method: paymentMethod,
    });

    // The backend clears the user's cart the moment the order row is
    // created (see orderController.createOrder), before payment is even
    // confirmed for Khalti -- so the badge should update right away too.
    notifyCartUpdated();

    if (paymentMethod === "cod") {
      toast.success("Order placed successfully!");
      navigate("/user");
      return;
    }

    if (paymentMethod === "khalti") {
      const payment = await api.post("/payment/initiate", {
        order_id: res.data.order_id,
      });

      window.location.href = payment.data.payment_url;
    }
  } catch (err) {
    console.error(err);
    const insufficient = err.response?.data?.insufficient_items;
    if (insufficient?.length) {
      insufficient.forEach((item) => {
        toast.error(
          item.available > 0
            ? `Only ${item.available} of "${item.name}" left — please update your cart.`
            : `"${item.name}" just sold out — please remove it from your cart.`
        );
      });
      navigate("/cart");
    } else {
      toast.error(err.response?.data?.message || "Could not place order");
    }
  } finally {
    setPlacingOrder(false);
  }

};

  const activePayment = PAYMENT_OPTIONS.find((p) => p.key === paymentMethod);

  return (
    <div className="checkout-page">
      <Navbar />

      <div className="checkout-hero">
        <h1>Complete Your Purchase</h1>
        <p>You're just a few paws away from making your pet happy!</p>
      </div>

      <div className="checkout-steps">
        <div className="checkout-step active">
          <span className="checkout-step-icon">
            <FaMapMarkerAlt />
          </span>
          <span>Shipping</span>
        </div>
        <div className="checkout-step-line" />
        <div className="checkout-step">
          <span className="checkout-step-icon">
            <FaTruck />
          </span>
          <span>Delivery</span>
        </div>
        <div className="checkout-step-line" />
        <div className="checkout-step">
          <span className="checkout-step-icon">
            <FaCreditCard />
          </span>
          <span>Payment</span>
        </div>
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">
          {/* ---------- Shipping Address ---------- */}
          <form className="checkout-card" onSubmit={handleSaveShipping}>
            <h3>
              <span className="checkout-card-number">1</span>
              <FaMapMarkerAlt /> Shipping Address
            </h3>

            <div className="checkout-form-grid">
              <label>
                Full Name
                <input
                  type="text"
                  placeholder="e.g. Ramesh Thapa"
                  value={shipping.full_name}
                  onChange={(e) => handleShippingChange("full_name", e.target.value)}
                  className={shippingErrors.full_name ? "checkout-input-error" : ""}
                />
              </label>

              <label>
                Phone Number
                <input
                  type="tel"
                  placeholder="e.g. 98XXXXXXXX"
                  value={shipping.phone_number}
                  onChange={(e) => handleShippingChange("phone_number", e.target.value)}
                  className={shippingErrors.phone_number ? "checkout-input-error" : ""}
                />
              </label>

              <label>
                City / District
                <input
                  type="text"
                  placeholder="e.g. Kathmandu"
                  value={shipping.city}
                  onChange={(e) => handleShippingChange("city", e.target.value)}
                  className={shippingErrors.city ? "checkout-input-error" : ""}
                />
              </label>

              <label>
                Tole / Area Name
                <input
                  type="text"
                  placeholder="e.g. Baluwatar"
                  value={shipping.tole}
                  onChange={(e) => handleShippingChange("tole", e.target.value)}
                  className={shippingErrors.tole ? "checkout-input-error" : ""}
                />
              </label>
            </div>

            <label className="checkout-full-width">
              Detailed Address / Landmarks
              <textarea
                rows={3}
                placeholder="House no, Street name, Near specific landmark..."
                value={shipping.detailed_address}
                onChange={(e) => handleShippingChange("detailed_address", e.target.value)}
              />
            </label>

            <div className="checkout-form-actions">
              <button type="submit" className="checkout-save-btn">
                {shippingSaved ? "Saved ✓" : "Save & Continue"}
              </button>
            </div>
          </form>

          {/* ---------- Payment Selection ---------- */}
          <div className="checkout-card">
            <h3>
              <span className="checkout-card-number">2</span>
              <FaCreditCard /> Payment Selection
            </h3>

            <div className="checkout-payment-grid">
              {PAYMENT_OPTIONS.map((option) => (
                <div
                  key={option.key}
                  className={`checkout-payment-option ${
                    paymentMethod === option.key ? "active" : ""
                  }`}
                  onClick={() => setPaymentMethod(option.key)}
                >
                  {option.tag && (
                    <span
                      className={`checkout-payment-tag checkout-payment-tag-${option.key}`}
                    >
                      {option.tag}
                    </span>
                  )}
                  <p>{option.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Order Summary ---------- */}
        <aside className="checkout-summary">
          <h3>Order Summary</h3>

          {loading ? (
            <p className="checkout-status">Loading your cart...</p>
          ) : error ? (
            <p className="checkout-status">{error}</p>
          ) : items.length === 0 ? (
            <p className="checkout-status">Your cart is empty.</p>
          ) : (
            <div className="checkout-summary-items">
              {items.map((item) => (
                <div className="checkout-summary-item" key={item.cart_id}>
                  <div className="checkout-summary-image">
                    <span className="checkout-summary-qty">{item.quantity}</span>
                    {item.image_url ? (
                      <img src={resolveImageSrc(item.image_url)} alt={item.name} />
                    ) : (
                      <div className="checkout-summary-noimage" />
                    )}
                  </div>
                  <div className="checkout-summary-info">
                    <p className="checkout-summary-name">{item.name}</p>
                    <p className="checkout-summary-price">
                      {formatPrice(Number(item.price) * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="checkout-summary-divider" />

          <div className="checkout-summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="checkout-summary-total">
            <span>TOTAL AMOUNT</span>
            <p>{formatPrice(total)}</p>
          </div>

          <button
            className="checkout-place-order-btn"
            onClick={handlePlaceOrder}
            disabled={placingOrder || loading || items.length === 0}
          >
            {placingOrder ? "Placing Order..." : "Place Your Order"}
          </button>
        </aside>
      </div>

      <Footer />
    </div>
  );
}