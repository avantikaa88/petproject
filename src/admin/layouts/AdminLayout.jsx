import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import Sidebar from "../components/AdminSidebar";
import Navbar from "../components/AdminNavbar";
import "../../styles/admin.css";

export default function AdminLayout() {
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    api
      .get("/auth/profile")
      .then((res) => {
        if (res.data.success) setAdmin(res.data.user);
      })
      .catch((err) => console.error("Failed to load admin profile:", err));
  }, []);

  return (
    <div className="admin-layout">
      <Sidebar />

      <div className="admin-main">
        <Navbar admin={admin} />

        <div className="admin-content">
          <Outlet context={{ admin }} />
        </div>
      </div>
    </div>
  );
}