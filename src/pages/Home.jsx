// Home.js
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import api from '../api/axios';

import { FaTruck, FaLock, FaUndo, FaCheckCircle } from "react-icons/fa";
import { FaPaw, FaDog, FaCat, FaBone } from "react-icons/fa";

import '../styles/home.css';

function Home() {
  const navigate = useNavigate();

  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Logged-in users shouldn't land on the public homepage — send them
  // straight to their own dashboard (admin panel for admins, /user for
  // everyone else), matching what the "Home" nav link already does.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (user?.role === "admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/user", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get("/products");
        if (res.data.success) setDbProducts((res.data.products || []).filter(Boolean));
      } catch (err) {
        console.error("Failed to load products:", err);
        setError("Could not load products right now.");
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  // Only show products that are actually available (in stock) on the
  // homepage's "All Products" section — out-of-stock items are hidden here
  // (they still show up in the full Shop page with an "Out of Stock" label).
  const products = dbProducts.filter((p) => Number(p.stock) > 0);

  return (
    <>
      <Navbar />

      <section className='hero'>
        <div className="overlay">
          <span className="badge">PET-FRIENDLY HOME EXPERTS</span>
          <h1>Give Your Furry Friends The Comfort They Deserve.</h1>
          <p>From wagging tails to happy purrs...</p>
          <button onClick={() => navigate('/shop')}>Shop Now</button>
        </div>
      </section>

      <section className='features'>
        <div className='feature-card'>
          <FaTruck size={30} />
          <h3>Fast Delivery Nationwide</h3>
        </div>

        <div className='feature-card'>
          <FaLock size={30} />
          <h3>Safe & Secure Payments</h3>
        </div>

        <div className='feature-card'>
          <FaUndo size={30} />
          <h3>Easy 15-Day Returns</h3>
        </div>
      </section>

      <section className='categories-section'>
        <h2>Shop by Category</h2>
        <p>Find exactly what your pet needs with our specialized collections.</p>

        <div className='categories-grid'>
          <div className='category-card'>
            <FaDog size={30} />
            <h3>Dogs</h3>
          </div>

          <div className='category-card'>
            <FaCat size={30} />
            <h3>Cats</h3>
          </div>

          <div className='category-card'>
            <FaPaw size={30} />
            <h3>Accessories</h3>
          </div>
        </div>
      </section>

      {/* PRODUCTS with Browse Products header */}
      <section className='products-section'>
        <div className="section-header">
          <div className="header-titles">
            <h2>All Products</h2>
            <p className="browse-products" onClick={() => navigate('/shop')} style={{ cursor: 'pointer' }}>
              Browse Products →
            </p>
          </div>
        </div>

        {loading ? (
          <p>Loading products...</p>
        ) : error ? (
          <p>{error}</p>
        ) : products.length === 0 ? (
          <p>No products available yet.</p>
        ) : (
          <div className='products-grid'>
            {products.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
              />
            ))}
          </div>
        )}
      </section>

      {/* WHY */}
      <section className='why-section'>
        <div className='why-text'>
          <h2>Why PawShop?</h2>
          <p>
            Founded in 2024, PawShop started with a simple mission: to bring the
            highest quality international pet brands to Nepal. We understand that pets
            are more than just animals; they are family members who deserve the very
            best.
          </p>

          <ul>
            <li>High-quality products for pets.</li>
            <li>Affordable prices with regular special offers.</li>
            <li>Safe and durable accessories your pets will love.</li>
            <li>Trusted by pet owners for quality and service.</li>
            <li>New arrivals added regularly to keep your pets happy.</li>
          </ul>

          {/* Stats */}
          <div className='stats-container'>
            <div className='stat-item'>
              <span className='stat-label'>Happy Pets Served in Nepal</span>
            </div>
          </div>
        </div>

        <img
          src='/images/why.jpg'
          alt='Happy pet with products'
          className='why-image'
        />
      </section>

      <Footer />
    </>
  );
}

export default Home;