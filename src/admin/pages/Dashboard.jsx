import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "../../styles/admin.css";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [productsRes, ordersRes, usersRes] = await Promise.all([
          api.get("/products"),
          api.get("/orders/admin/all"),
          api.get("/users"),
        ]);

        if (productsRes.data.success) setProducts(productsRes.data.products);
        if (ordersRes.data.success) setOrders(ordersRes.data.orders);
        if (usersRes.data.success) {
          // Admins shouldn't inflate the "Total Users" customer count
          const customers = usersRes.data.users.filter(
            (u) => u.role === "customer"
          );
          setUsers(customers);
        }
      } catch (err) {
        console.error("Failed to load admin dashboard:", err);
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) return <div className="admin-loading">Loading dashboard...</div>;
  if (error) return <div className="admin-loading">{error}</div>;

  // "Total Sales" should only reflect revenue that has actually been
  // received, not merely revenue that has been ordered:
  //   - Khalti orders count as soon as the gateway confirms the payment
  //     (verifyKhalti sets payment_status = 'paid' immediately).
  //   - COD orders don't have money in hand until the order is delivered.
  //     The backend (Order.updateStatus) only flips a COD order's
  //     payment_status to 'paid' once its status becomes 'delivered', so
  //     checking payment_status here already encodes "COD + delivered"
  //     without needing to special-case payment_method.
  const totalSales = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const formatCurrency = (amount) =>
    `Rs. ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  // Matches the "NPR 4,500" style used in the Recent Orders table (whole
  // numbers, no decimals) -- kept separate from formatCurrency above so the
  // stat cards elsewhere on this page keep their existing "Rs." formatting.
  const formatOrderTotal = (amount) =>
    `NPR ${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  return (
    <div className="admin-dashboard">
      <div className="admin-stats">
        <Link to="/admin/products" className="admin-stat-card">
          <h3>{products.length}</h3>
          <p>Total Products</p>
        </Link>

        <Link to="/admin/orders" className="admin-stat-card">
          <h3>{orders.length}</h3>
          <p>Total Orders</p>
        </Link>

        <Link to="/admin/users" className="admin-stat-card">
          <h3>{users.length}</h3>
          <p>Total Users</p>
        </Link>

        <div className="admin-stat-card">
          <h3>{formatCurrency(totalSales)}</h3>
          <p>Total Sales</p>
          <span className="admin-muted admin-stat-subnote">
            Khalti: counted once paid &middot; COD: counted once delivered
          </span>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header admin-panel-header-with-sub">
          <div>
            <h2>Recent Orders</h2>
            <p className="admin-panel-subtitle">
              Latest customer transactions across all channels.
            </p>
          </div>
          <Link to="/admin/orders" className="admin-link">
            View All Orders
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="admin-muted">No orders yet.</p>
        ) : (
          <table className="admin-table recent-orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th className="recent-orders-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.order_id}>
                  <td>#{order.order_id}</td>
                  <td>{order.full_name}</td>
                  <td>{formatDate(order.created_at)}</td>
                  <td className="recent-orders-total">
                    {formatOrderTotal(order.total_amount)}
                  </td>
                  <td>
                    <span
                      className={`recent-order-status ${
                        order.status === "delivered"
                          ? "recent-order-status-delivered"
                          : "recent-order-status-default"
                      }`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="recent-orders-actions-col">
                    <Link to="/admin/orders" className="recent-order-details-link">
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}