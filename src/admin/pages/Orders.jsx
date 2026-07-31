import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { resolveImageSrc } from "../components/ProductForm";
import "../../styles/admin.css";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/orders/admin/all");
      if (res.data.success) setOrders(res.data.orders);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setError("Could not load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId
            ? {
                ...o,
                status: res.data.status ?? newStatus,
                payment_status: res.data.payment_status ?? o.payment_status,
              }
            : o
        )
      );
      toast.success(`Order status updated to "${newStatus}"`);
    } catch (err) {
      console.error("Failed to update order status:", err);
      toast.error(err.response?.data?.message || "Could not update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCurrency = (amount) =>
    `Rs. ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  if (loading) return <div className="admin-loading">Loading orders...</div>;
  if (error) return <div className="admin-loading">{error}</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Orders</h2>
      </div>

      <div className="admin-panel">
        {orders.length === 0 ? (
          <p className="admin-muted">No orders have been placed yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Shipping Address</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.order_id}>
                  <td>#{order.order_id}</td>
                  <td>
                    <div>{order.full_name}</div>
                    <div className="admin-muted">{order.email}</div>
                  </td>
                  <td>
                    {order.items && order.items.length > 0 ? (
                      <div className="admin-order-items">
                        {order.items.map((item) => (
                          <div
                            className="admin-order-item"
                            key={`${order.order_id}-${item.product_id}`}
                            title={`${item.name} × ${item.quantity}`}
                          >
                            {item.image_url ? (
                              <img
                                src={resolveImageSrc(item.image_url)}
                                alt={item.name}
                                className="admin-table-thumb"
                              />
                            ) : (
                              <div className="admin-order-item-noimage">No Image</div>
                            )}
                            <span className="admin-order-item-qty">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="admin-muted">—</span>
                    )}
                  </td>
                  <td>{formatDate(order.created_at)}</td>
                  <td>{formatCurrency(order.total_amount)}</td>
                  <td>{order.shipping_address || "—"}</td>
                  <td>
                    <span className={`status-badge pay-${order.payment_status}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td>
                    {order.status === "delivered" ? (
                      <span
                        className="status-badge status-delivered"
                        title="Delivered orders are final and cannot be changed"
                      >
                        delivered
                      </span>
                    ) : (
                      <select
                        value={order.status}
                        disabled={updatingId === order.order_id}
                        onChange={(e) =>
                          handleStatusChange(order.order_id, e.target.value)
                        }
                        className={`status-select status-${order.status}`}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <Link
                      to={`/admin/orders/${order.order_id}`}
                      className="recent-order-details-link"
                    >
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