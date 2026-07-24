import { NavLink, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaBoxOpen,
  FaTags,
  FaShoppingCart,
  FaUsers,
  FaSignOutAlt,
} from "react-icons/fa";

import "../../styles/admin.css";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    "admin-menu" + (isActive ? " active" : "");

  return (
    <div className="admin-sidebar">
      <h2 className="admin-sidebar-logo">🐾 PawShop</h2>

      <nav>
        <NavLink to="/admin" end className={linkClass}>
          <FaTachometerAlt />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/admin/products" className={linkClass}>
          <FaBoxOpen />
          <span>Products</span>
        </NavLink>

        <NavLink to="/admin/categories" className={linkClass}>
          <FaTags />
          <span>Categories</span>
        </NavLink>

        <NavLink to="/admin/orders" className={linkClass}>
          <FaShoppingCart />
          <span>Orders</span>
        </NavLink>

        <NavLink to="/admin/users" className={linkClass}>
          <FaUsers />
          <span>Users</span>
        </NavLink>
      </nav>

      <button className="admin-logout-btn" onClick={handleLogout}>
        <FaSignOutAlt />
        Logout
      </button>
    </div>
  );
}