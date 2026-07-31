import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { resolveImageSrc } from "../components/ProductForm";
import "../../styles/admin.css";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/orders/${id}`);
        if (res.data.success) setOrder(res.data.order);
      } catch (err) {
        console.error("Failed to load order:", err);
        setError(
          err.response?.data?.message || "Could not load this order."
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  const formatCurrency = (amount) =>
    `Rs. ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  if (loading) return <div className="admin-loading">Loading order...</div>;

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <h1>Order Details</h1>
          <button className="admin-btn" onClick={() => navigate("/admin/orders")}>
            Back to Orders
          </button>
        </div>
        <div className="admin-panel">
          <p className="admin-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const items = order.items || [];
  const itemsTotal = items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Order #{order.order_id}</h1>
        <Link to="/admin/orders" className="admin-btn">
          Back to Orders
        </Link>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2>Summary</h2>
        </div>
        <div className="order-detail-summary">
          <div>
            <span className="admin-muted">Customer</span>
            <p>{order.full_name}</p>
            <p className="admin-muted">{order.email}</p>
          </div>
          <div>
            <span className="admin-muted">Date Placed</span>
            <p>{formatDate(order.created_at)}</p>
          </div>
          <div>
            <span className="admin-muted">Shipping Address</span>
            <p>{order.shipping_address || "—"}</p>
          </div>
          <div>
            <span className="admin-muted">Payment</span>
            <p>
              <span className={`status-badge pay-${order.payment_status}`}>
                {order.payment_status}
              </span>{" "}
              <span className="admin-muted">({order.payment_method})</span>
            </p>
          </div>
          <div>
            <span className="admin-muted">Status</span>
            <p>
              <span className={`status-badge status-${order.status}`}>
                {order.status}
              </span>
            </p>
          </div>
          <div>
            <span className="admin-muted">Order Total</span>
            <p className="order-detail-total">
              {formatCurrency(order.total_amount)}
            </p>
          </div>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2>Products</h2>
        </div>

        {items.length === 0 ? (
          <p className="admin-muted">No items found for this order.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.product_id}>
                  <td>
                    <div className="order-detail-product">
                      {item.image_url ? (
                        <img
                          src={resolveImageSrc(item.image_url)}
                          alt={item.name}
                          className="admin-table-thumb"
                        />
                      ) : (
                        <div className="admin-table-thumb-placeholder">🐾</div>
                      )}
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td>{formatCurrency(item.price)}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="order-detail-items-total-label">
                  Items Total
                </td>
                <td className="order-detail-items-total-value">
                  {formatCurrency(itemsTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}