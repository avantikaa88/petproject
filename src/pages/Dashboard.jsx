import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaBoxOpen, FaClipboardList } from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/dashboard.css";

const API_BASE = "http://localhost:5000/api";

// Orders with these statuses count as "active" (not yet finished or cancelled)
const ACTIVE_STATUSES = ["pending", "processing", "shipped"];

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
          <Sidebar user={user} activeItem="profile" onSignOut={handleSignOut} />

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

            {/* Profile Section */}
            <div className="profile-card">
              <div className="profile-card-header">
                <div>
                  <h2>Personal Information</h2>
                  <p className="muted">
                    This is the information on your PawShop account.
                  </p>
                </div>
              </div>

              <div className="information">
                <div className="info-field">
                  <span className="label">Full Name</span>
                  <span className="value">{user?.full_name || "—"}</span>
                </div>

                <div className="info-field">
                  <span className="label">Email Address</span>
                  <span className="value">{user?.email || "—"}</span>
                </div>

                <div className="info-field">
                  <span className="label">Username</span>
                  <span className="value">{user?.username || "—"}</span>
                </div>

                <div className="info-field">
                  <span className="label">Phone Number</span>
                  <span className="value">{user?.phone_number || "—"}</span>
                </div>

                <div className="info-field">
                  <span className="label">Gender</span>
                  <span className="value">{user?.gender || "—"}</span>
                </div>

                <div className="info-field">
                  <span className="label">Date of Birth</span>
                  <span className="value">{formatDate(user?.date_of_birth)}</span>
                </div>

                <div className="info-field">
                  <span className="label">Address</span>
                  <span className="value">{user?.address || "—"}</span>
                </div>
              </div>
            </div>

            {/* Order History -- real orders from the database */}
            <div className="orders-section">
              <h2>Order History</h2>

              {orders.length === 0 ? (
                <p className="muted">You haven't placed any orders yet.</p>
              ) : (
                <div className="orders-list">
                  {orders.map((order) => (
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