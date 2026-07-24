import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaBoxOpen,
  FaEye,
  FaSearch,
  FaCreditCard,
  FaChevronRight,
} from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/dashboard.css";
import "../styles/orderHistory.css";

const API_BASE = "http://localhost:5000/api";
// Uploaded product images are stored as relative paths like "/uploads/xyz.png"
// and served from the backend's root (not /api). This turns that into a full URL.
const SERVER_ORIGIN = API_BASE.replace(/\/api\/?$/, "");
const resolveImageSrc = (imagePath) => {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `${SERVER_ORIGIN}${imagePath}`;
};

const ORDERS_PER_PAGE = 4;

// Checkout bundles the payment method into the shipping_address string as
// "... | Payment Method: X" (see Checkout.jsx's buildShippingAddressText).
// Split that back apart so the address and payment method can be shown
// in their own spots, matching how the rest of the order info is laid out.
const splitShippingAddress = (raw) => {
  if (!raw) return { address: "", paymentMethod: "" };
  const parts = raw.split(" | ");
  const paymentPart = parts.find((p) => p.startsWith("Payment Method:"));
  const paymentMethod = paymentPart ? paymentPart.replace("Payment Method:", "").trim() : "";
  const address = parts.filter((p) => !p.startsWith("Payment Method:")).join(", ");
  return { address, paymentMethod };
};

const formatOrderNumber = (id) => `PS-${String(id).padStart(5, "0")}`;

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

const formatCurrency = (amount) =>
  `NPR ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

function OrderHistory() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  // Full line-item detail per order, fetched lazily (view details needs it)
  const [details, setDetails] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    const fetchData = async () => {
      try {
        const [profileRes, ordersRes] = await Promise.all([
          axios.get(`${API_BASE}/auth/profile`, authHeader),
          axios.get(`${API_BASE}/orders`, authHeader),
        ]);

        if (profileRes.data.success) setUser(profileRes.data.user);
        if (ordersRes.data.success) setOrders(ordersRes.data.orders || []);
      } catch (err) {
        console.error("Error loading order history:", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
        } else {
          setError("Could not load your order history right now. Please try again shortly.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Fetches (and caches) an order's full line items -- used by View Details
  const loadOrderDetails = async (orderId) => {
    if (details[orderId]) return details[orderId];

    const token = localStorage.getItem("token");
    const res = await axios.get(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.data.success) {
      const items = res.data.order.items || [];
      setDetails((prev) => ({ ...prev, [orderId]: items }));
      return items;
    }
    return [];
  };

  const toggleDetails = async (orderId) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!details[orderId]) {
      setDetailsLoading(orderId);
      try {
        await loadOrderDetails(orderId);
      } catch (err) {
        console.error("Error loading order details:", err);
      } finally {
        setDetailsLoading(null);
      }
    }
  };

  const filteredSortedOrders = useMemo(() => {
    let result = [...orders];

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((order) => {
        const orderNumber = formatOrderNumber(order.order_id).toLowerCase();
        return orderNumber.includes(term) || (order.status || "").toLowerCase().includes(term);
      });
    }

    result.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === "total-high") return b.total_amount - a.total_amount;
      if (sortBy === "total-low") return a.total_amount - b.total_amount;
      return 0;
    });

    return result;
  }, [orders, sortBy, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredSortedOrders.length / ORDERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = filteredSortedOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  if (loading) {
    return <div className="dashboard-loading">Loading your order history...</div>;
  }

  if (error) {
    return <div className="dashboard-loading">{error}</div>;
  }

  return (
    <>
      <Navbar />

      <div className="dashboard">
        <div className="welcome">
          <div className="welcome-header-row">
            <div>
              <div className="breadcrumb">
                <Link to="/">Home</Link>
                <FaChevronRight className="breadcrumb-sep" />
                <Link to="/user">My Account</Link>
                <FaChevronRight className="breadcrumb-sep" />
                <span>Order History</span>
              </div>
              <h1>Your Order History</h1>
              <p>View and manage your past purchases and reorder your pet's favorites.</p>
            </div>

            <div className="orders-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Search order ID or status..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <div className="dashboard-container">
          <Sidebar user={user} onSignOut={handleSignOut} />

          <div className="main-content">
            <div className="orders-section">
              <div className="orders-toolbar">
                <div className="orders-toolbar-right">
                  <span className="muted">Showing {filteredSortedOrders.length} orders</span>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="total-high">Total: High to Low</option>
                    <option value="total-low">Total: Low to High</option>
                  </select>
                </div>
              </div>

              {pageOrders.length === 0 ? (
                <p className="muted">No orders match your search.</p>
              ) : (
                <div className="orders-list">
                  {pageOrders.map((order) => {
                    const { address, paymentMethod } = splitShippingAddress(
                      order.shipping_address
                    );

                    return (
                      <div className="order-card" key={order.order_id}>
                        <div className="order-card-meta-row">
                          <div>
                            <span className="meta-label">ORDER PLACED</span>
                            <span className="meta-value">{formatDate(order.created_at)}</span>
                          </div>
                          <div>
                            <span className="meta-label">TOTAL</span>
                            <span className="meta-value">
                              {formatCurrency(order.total_amount)}
                            </span>
                          </div>
                          {address && (
                            <div>
                              <span className="meta-label">SHIP TO</span>
                              <span className="meta-value" title={address}>
                                {address}
                              </span>
                            </div>
                          )}
                          <div className="order-number">
                            <span className="meta-label">ORDER #</span>
                            <span className="meta-value">{formatOrderNumber(order.order_id)}</span>
                          </div>
                        </div>

                        <div className="order-card-top">
                          <div className="order-card-thumbs">
                            {order.preview_images && order.preview_images.length > 0 ? (
                              order.preview_images.map((img, i) => (
                                <img
                                  key={i}
                                  src={resolveImageSrc(img)}
                                  alt="Product"
                                  className="order-thumb"
                                />
                              ))
                            ) : (
                              <div className="order-thumb order-thumb-placeholder">
                                <FaBoxOpen />
                              </div>
                            )}
                          </div>

                          <div className="order-card-info">
                            <span className={`status-badge status-${order.status}`}>
                              {order.status}
                            </span>
                            <span className={`status-badge pay-${order.payment_status}`}>
                              {order.payment_status}
                            </span>
                            <p className="muted">
                              {order.item_count} item{order.item_count === 1 ? "" : "s"} in this
                              order
                            </p>
                          </div>

                          <div className="order-card-actions">
                            <button
                              className="view-details-btn"
                              onClick={() => toggleDetails(order.order_id)}
                            >
                              <FaEye /> {expandedId === order.order_id ? "Hide" : "View"} Details
                            </button>
                          </div>
                        </div>

                        {expandedId === order.order_id && (
                          <div className="order-details">
                            {detailsLoading === order.order_id ? (
                              <p className="muted">Loading items...</p>
                            ) : (
                              <ul className="order-items-list">
                                {(details[order.order_id] || []).map((item) => (
                                  <li key={item.product_id}>
                                    {item.image_url && (
                                      <img
                                        src={resolveImageSrc(item.image_url)}
                                        alt={item.name}
                                        className="order-item-thumb"
                                      />
                                    )}
                                    <span className="item-name">{item.name}</span>
                                    <span className="muted">x{item.quantity}</span>
                                    <span>{formatCurrency(item.price * item.quantity)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        <div className="order-card-footer">
                          {paymentMethod && (
                            <span>
                              <FaCreditCard /> Paid via {paymentMethod}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <div className="pagination">
                  <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={p === currentPage ? "active" : ""}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default OrderHistory;