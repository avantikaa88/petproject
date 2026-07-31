import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaChevronRight } from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/dashboard.css";
import "../styles/orderhistory.css";

const API_BASE = "http://localhost:5000/api";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE}/auth/profile`, authHeader);
        if (res.data.success) setUser(res.data.user);
      } catch (err) {
        console.error("Error loading profile:", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
        } else {
          setError("Could not load your profile right now. Please try again shortly.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";

  if (loading) {
    return <div className="dashboard-loading">Loading your profile...</div>;
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
                <span>My Profile</span>
              </div>
              <h1>My Profile</h1>
              <p>View the personal information on your PawShop account.</p>
            </div>
          </div>
        </div>

        <div className="dashboard-container">
          <Sidebar user={user} onSignOut={handleSignOut} />

          <div className="main-content">
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
                  <span className="label">Username</span>
                  <span className="value">{user?.username || "—"}</span>
                </div>

                <div className="info-field">
                  <span className="label">Gender</span>
                  <span className="value">{user?.gender || "—"}</span>
                </div>

                <div className="info-field">
                  <span className="label">Address</span>
                  <span className="value">{user?.address || "—"}</span>
                </div>

                <div className="info-field">
                  <span className="label">Email Address</span>
                  <span className="value">{user?.email || "—"}</span>
                </div>

                <div className="info-field">
                  <span className="label">Phone Number</span>
                  <span className="value">{user?.phone_number || "—"}</span>
                </div>

                <div className="info-field">
                  <span className="label">Date of Birth</span>
                  <span className="value">{formatDate(user?.date_of_birth)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default Profile;