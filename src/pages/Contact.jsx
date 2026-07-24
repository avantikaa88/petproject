import React from 'react';
import Navbar from '../components/Navbar'; // Adjust path as needed
import Footer from '../components/Footer'; // Adjust path as needed
import '../styles/contact.css';

const ContactPage = () => {
  // Contact information from footer
  const contactInfo = {
    email: "hello@pawshop.com.np",
    phone: "+977 1-4444444",
    businessName: "PawShop Nepal",
    tagline: "Your neighborhood pet shop, now online."
  };

  return (
    <div className="contact-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="contact-hero-content">
          <h1>Contact Us</h1>
          <p>We'd love to hear from you! Reach out with any questions, concerns, or just to say hello.</p>
        </div>
      </section>

      <div className="contact-container">
        {/* Contact Information Cards */}
        <div className="contact-info-grid">
          <div className="contact-card">
            <div className="contact-card-icon">📧</div>
            <h3>Email Us</h3>
            <p>For general inquiries, orders, or support</p>
            <span className="contact-info-text">
              {contactInfo.email}
            </span>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">📞</div>
            <h3>Call Us</h3>
            <p>Mon-Fri, 9AM - 6PM (NPT)</p>
            <span className="contact-info-text">
              {contactInfo.phone}
            </span>
          </div>
        </div> 

        
        <div className="contact-business-section">
          <div className="contact-business-info">
            <h2>{contactInfo.businessName}</h2>
            <p className="business-tagline">{contactInfo.tagline}</p>
            <p className="business-description">
              We provide the best for your furry family with love and care. 
              Whether you have a question about products or orders
              we're here to help!
            </p>
            
            <div className="business-hours">
              <h4>Business Hours</h4>
              <ul>
                <li><span>Monday - Friday:</span> 9:00 AM - 6:00 PM</li>
                <li><span>Saturday:</span> 10:00 AM - 4:00 PM</li>
                <li><span>Sunday:</span> Closed</li>
              </ul>
            </div>

            <div className="business-social">
              <h4>Follow Us</h4>
              <div className="social-links">
                <a href="#" className="social-link"> Facebook</a>
                <a href="#" className="social-link"> Instagram</a>
                <a href="#" className="social-link"> Twitter</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactPage;