import { useNavigate } from "react-router-dom";
import "../styles/footer.css";

const Footer = () => {
  const navigate = useNavigate();

  // Logged in if we have a token saved from a previous login/register
  const token = localStorage.getItem("token");
  const isLoggedIn = !!token;
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  // Same rule as the Navbar's "Home" link: logged-in users go back to their
  // own dashboard (admin panel or user dashboard); logged-out visitors go to
  // the public homepage.
  const handleHomeClick = () => {
    if (isLoggedIn && user?.role === "admin") {
      navigate("/admin");
    } else if (isLoggedIn) {
      navigate("/user");
    } else {
      navigate("/");
    }
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Left Section - Brand */}
        <div className="footer-brand">
          <h2 className="footer-logo">PawShop</h2>
          <p className="footer-tagline">
            Your neighborhood pet shop, now online. We provide the best for your
            furry family members with love and care.
          </p>
        </div>

        {/* Quick Links Section */}
        <div className="footer-section">
          <h3 className="footer-section-title">Quick Links</h3>
          <ul className="footer-links">
            <li onClick={handleHomeClick} style={{ cursor: "pointer" }}>Home</li>
            <li onClick={() => navigate("/shop")} style={{ cursor: "pointer" }}>Shop All</li>
          </ul>
        </div>

        {/* Customer Service Section */}
        <div className="footer-section">
          <h3 className="footer-section-title">Customer Service</h3>
          <ul className="footer-links">
            <li onClick={() => navigate("/contact")} style={{ cursor: "pointer" }}>Contact Us</li>
          </ul>
        </div>

        {/* Get in Touch Section */}
        <div className="footer-section">
          <h3 className="footer-section-title">Get in Touch</h3>
          <ul className="footer-contact">
            <li> hello@pawshop.com.np</li>
            <li> +977 1-4444444</li>
          </ul>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="footer-bottom">
        <p>© 2026 PawShop Nepal. All prices in Nepalese Rupees (NPR).</p>
      </div>
    </footer>
  );
};

export default Footer;