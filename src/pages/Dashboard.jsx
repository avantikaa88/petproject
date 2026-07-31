import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaBoxOpen, FaClipboardList, FaChevronRight } from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/dashboard.css";
import "../styles/orderhistory.css";

const API_BASE = "http://localhost:5000/api";

// Orders with these statuses count as "active" (not yet finished or cancelled)
const ACTIVE_STATUSES = ["pending", "processing", "shipped"];

// How many recent orders to preview on the dashboard -- the full list
// lives on the Order History page.
const RECENT_ORDERS_LIMIT = 3;

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        // Only the display name is used here (for the greeting) -- the rest
        // of the user's personal details live on the My Profile page.
        if (profileRes.data.success) {
          setUser(profileRes.data.user);
        }

        if (ordersRes.data.success) {
          setOrders(ordersRes.data.orders || []);
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
        } else {
          setError("Could not load your dashboard right now. Please try again shortly.");
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

  if (loading) {
    return <div className="dashboard-loading">Loading your dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-loading">{error}</div>;
  }

  const activeOrderCount = orders.filter((o) =>
    ACTIVE_STATUSES.includes(o.status)
  ).length;

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";

  const formatCurrency = (amount) =>
    `NPR ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, RECENT_ORDERS_LIMIT);

  return (
    <>
      <Navbar />

      <div className="dashboard">
        <div className="welcome">
          <h1>Namaste, {user?.full_name}!</h1>
          <p>
            Manage your profile, track your orders, and keep your furry
            friend happy.
          </p>
        </div>

        <div className="dashboard-container">
          <Sidebar user={user} onSignOut={handleSignOut} />

          <div className="main-content">
            {/* Stats -- both pulled from real order data */}
            <div className="stats">
              <div className="stat-card highlight">
                <div className="stat-icon">
                  <FaBoxOpen />
                </div>
                <div>
                  <h3>Active Orders</h3>
                  <p>{activeOrderCount}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FaClipboardList />
                </div>
                <div>
                  <h3>Total Orders</h3>
                  <p>{orders.length}</p>
                </div>
              </div>
            </div>

            {/* Recent activity -- a short preview only; the full, searchable
                list lives on the Order History page. */}
            <div className="orders-section">
              <div className="orders-toolbar">
                <h2>Recent Orders</h2>
                {orders.length > 0 && (
                  <Link
                    to="/user/orders"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "#d9825f",
                      fontWeight: 600,
                      fontSize: "14px",
                      textDecoration: "none",
                    }}
                  >
                    View all <FaChevronRight size={11} />
                  </Link>
                )}
              </div>

              {recentOrders.length === 0 ? (
                <p className="muted">You haven't placed any orders yet.</p>
              ) : (
                <div className="orders-list">
                  {recentOrders.map((order) => (
                    <div className="order-card" key={order.order_id}>
                      <div>
                        <h4>Order #{order.order_id}</h4>
                        <p className="muted">{formatDate(order.created_at)}</p>
                        {order.shipping_address && (
                          <p className="muted">{order.shipping_address}</p>
                        )}
                      </div>
                      <div className="order-meta">
                        <span className={`status-badge status-${order.status}`}>
                          {order.status}
                        </span>
                        <span className={`status-badge pay-${order.payment_status}`}>
                          {order.payment_status}
                        </span>
                        <span className="order-total">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>
                    </div>
                  ))}
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

export default Dashboard;