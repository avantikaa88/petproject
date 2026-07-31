import { Link, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaUser, FaBox, FaSignOutAlt } from "react-icons/fa";

// Only "Dashboard", "My Profile" and "Order History" are wired up to real
// pages for now. More items (wishlist, addresses, payments, settings) will
// be added once those features exist -- keeping the sidebar limited avoids
// dead links.
const MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: <FaTachometerAlt />, path: "/user" },
  { key: "profile", label: "My Profile", icon: <FaUser />, path: "/user/profile" },
  { key: "orders", label: "Order History", icon: <FaBox />, path: "/user/orders" },
];

function Sidebar({ user, onSignOut }) {
  const location = useLocation();

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="sidebar">
      <div className="sidebar-profile">
        <div className="sidebar-avatar">{initials}</div>
        <h3>{user?.full_name || "Loading..."}</h3>
        <p>{memberSince ? `Pet Parent since ${memberSince}` : ""}</p>
      </div>

      <ul>
        {MENU_ITEMS.map((item) => (
          <li key={item.key} className={location.pathname === item.path ? "active" : ""}>
            <Link to={item.path}>
              <span className="menu-icon">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <button className="signout-btn" onClick={onSignOut}>
        <FaSignOutAlt />
        Sign Out
      </button>
    </div>
  );
}

export default Sidebar;