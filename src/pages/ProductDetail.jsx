import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FaShoppingCart, FaHeart, FaMinus, FaPlus, FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../api/axios";
import { addToGuestCart } from "../utils/guestCart";
import { notifyCartUpdated } from "../utils/cartEvents";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/productDetail.css";

const SERVER_ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");

const resolveImageSrc = (imageUrl) => {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${SERVER_ORIGIN}${imageUrl}`;
};

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [cartStatus, setCartStatus] = useState(null); // null | adding | added
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [related, setRelated] = useState([]);

  useEffect(() => {
    // Guard against bad or missing ids (e.g. a stray "/product/undefined"
    // link) so we never fire a doomed request to the API.
    if (!id || id === "undefined") {
      setProduct(null);
      setError("Product not found.");
      setLoading(false);
      return;
    }

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");
        setQuantity(1);
        setActiveTab("description");
        setActiveImageIndex(0);
        const res = await api.get(`/products/${id}`);
        if (res.data.success) setProduct(res.data.product);
      } catch (err) {
        console.error("Failed to load product:", err);
        setError("Product not found.");
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
    window.scrollTo({ top: 0 });
  }, [id]);

  useEffect(() => {
    const loadRelated = async () => {
      if (!product) return;
      try {
        const res = await api.get("/products", {
          params: product.category ? { category: product.category } : {},
        });
        if (res.data.success) {
          const others = res.data.products.filter(
            (p) => p.product_id !== product.product_id
          );
          setRelated(others.slice(0, 4));
        }
      } catch (err) {
        console.error("Failed to load related products:", err);
      }
    };
    loadRelated();
  }, [product]);

  const outOfStock = product ? Number(product.stock) <= 0 : false;
  const lowStock = product && !outOfStock && Number(product.stock) <= 5;

  const isNewProduct = useMemo(() => {
    if (!product?.created_at) return false;
    return Date.now() - new Date(product.created_at).getTime() < NEW_WINDOW_MS;
  }, [product]);

  const formatPrice = (amount) => `NPR ${Number(amount).toLocaleString("en-US")}`;

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (product && next > Number(product.stock)) return Number(product.stock);
      return next;
    });
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      // Not logged in yet — keep it in the local guest cart instead of
      // losing it; it merges into their real cart once they sign in.
      setCartStatus("adding");
      addToGuestCart(product, quantity);
      setCartStatus("added");
      toast.success("Added to cart!");
      setTimeout(() => setCartStatus(null), 1500);
      return;
    }

    setCartStatus("adding");
    try {
      const res = await api.post("/cart", {
        product_id: product.product_id,
        quantity,
      });
      setCartStatus("added");
      notifyCartUpdated();
      if (res.data?.capped) {
        toast.warning(res.data.message || "Quantity was reduced to match available stock.");
      } else {
        toast.success("Added to cart!");
      }
      setTimeout(() => setCartStatus(null), 1500);
    } catch (err) {
      console.error("Failed to add to cart:", err);
      setCartStatus(null);
      toast.error(err.response?.data?.message || "Could not add item to cart");
    }
  };

  if (loading) {
    return (
      <div className="pd-page">
        <Navbar />
        <p className="pd-status">Loading product...</p>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="pd-page">
        <Navbar />
        <p className="pd-status">{error || "Product not found."}</p>
        <Footer />
      </div>
    );
  }

  return (
    <div className="pd-page">
      <Navbar />

      <div className="pd-breadcrumb">
        <span onClick={() => navigate("/")}>Home</span> /{" "}
        <span onClick={() => navigate("/shop")}>Shop</span>
        {product.category && (
          <>
            {" "}
            / <span>{product.category}</span>
          </>
        )}{" "}
        / <span className="pd-breadcrumb-current">{product.name}</span>
      </div>

      <div className="pd-layout">
        {/* ---------- Image ---------- */}
        <div className="pd-image-col">
          <div className="pd-main-image">
            {isNewProduct && <span className="pd-badge pd-badge-new">New</span>}
            {outOfStock && <span className="pd-badge pd-badge-out">Out of Stock</span>}
            {lowStock && <span className="pd-badge pd-badge-low">Low Stock</span>}
            {product.images && product.images.length > 0 ? (
              <img
                src={resolveImageSrc(
                  product.images[activeImageIndex]?.image_url || product.images[0].image_url
                )}
                alt={product.name}
              />
            ) : (
              <div className="pd-no-image">No Image Available</div>
            )}
          </div>

          {product.images && product.images.length > 1 && (
            <div className="pd-thumbnail-row">
              {product.images.map((img, index) => (
                <button
                  key={img.image_id ?? `legacy-${index}`}
                  type="button"
                  className={`pd-thumbnail${index === activeImageIndex ? " pd-thumbnail-active" : ""}`}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <img src={resolveImageSrc(img.image_url)} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Info ---------- */}
        <div className="pd-info-col">
          {product.category && (
            <p className="pd-category">{product.category.toUpperCase()}</p>
          )}
          <h1 className="pd-title">{product.name}</h1>

          <p className="pd-stock-line">
            {outOfStock ? (
              <span className="pd-stock-out">Out of Stock</span>
            ) : (
              <span className="pd-stock-in">
                <FaCheckCircle /> In Stock{lowStock ? ` — only ${product.stock} left` : ""}
              </span>
            )}
          </p>

          <div className="pd-price-row">
            <span className="pd-price">{formatPrice(product.price)}</span>
          </div>

          <div className="pd-quantity-row">
            <p className="pd-label">Quantity</p>
            <div className="pd-quantity-control">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={outOfStock || quantity <= 1}
                aria-label="Decrease quantity"
              >
                <FaMinus />
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={outOfStock || quantity >= Number(product.stock)}
                aria-label="Increase quantity"
              >
                <FaPlus />
              </button>
            </div>
            {lowStock && <p className="pd-stock-hint">Limited stock available!</p>}
          </div>

          <div className="pd-actions">
            <button
              className="pd-add-btn"
              disabled={outOfStock || cartStatus === "adding"}
              onClick={handleAddToCart}
            >
              <FaShoppingCart />
              {outOfStock
                ? "Out of Stock"
                : cartStatus === "adding"
                ? "Adding..."
                : cartStatus === "added"
                ? "Added to Cart!"
                : "Add to Cart"}
            </button>
          </div>

          <div className="pd-tabs">
            <button
              className={activeTab === "description" ? "active" : ""}
              onClick={() => setActiveTab("description")}
            >
              Description
            </button>
            <button
              className={activeTab === "shipping" ? "active" : ""}
              onClick={() => setActiveTab("shipping")}
            >
              Shipping & Returns
            </button>
          </div>

          <div className="pd-tab-content">
            {activeTab === "description" && (
              <div>
                <h3>Product Details</h3>
                <p>{product.description || "No description provided for this product yet."}</p>
              </div>
            )}
            {activeTab === "shipping" && (
              <div>
                <h3>Shipping & Returns</h3>
                <p>
                  Orders are typically processed within 1-2 business days.
                  Contact us at hello@pawshop.com.np if you have questions
                  about a specific order or need to arrange a return.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Related products ---------- */}
      {related.length > 0 && (
        <div className="pd-related">
          <div className="pd-related-header">
            <div>
              <h2>You Might Also Like</h2>
              <p>More from {product.category || "our shop"}</p>
            </div>
            <Link to="/shop" className="pd-related-link">
              View All Products →
            </Link>
          </div>

          <div className="pd-related-grid">
            {related.map((item) => (
              <div
                className="pd-related-card"
                key={item.product_id}
                onClick={() => item.product_id && navigate(`/product/${item.product_id}`)}
              >
                <div className="pd-related-image">
                  {item.image_url ? (
                    <img src={resolveImageSrc(item.image_url)} alt={item.name} />
                  ) : (
                    <div className="pd-no-image">No Image</div>
                  )}
                </div>
                <p className="pd-related-name">{item.name}</p>
                <p className="pd-related-price">{formatPrice(item.price)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}