import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFilter,
  FaTh,
  FaList,
  FaChevronLeft,
  FaChevronRight,
  FaShoppingCart,
} from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../api/axios";
import { addToGuestCart } from "../utils/guestCart";
import { notifyCartUpdated } from "../utils/cartEvents";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/shop.css";

// The API base URL is "http://localhost:5000/api"; uploaded images are
// served from the server root (e.g. "http://localhost:5000/uploads/...").
const SERVER_ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");

const resolveImageSrc = (imageUrl) => {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${SERVER_ORIGIN}${imageUrl}`;
};

const PAGE_SIZE = 10; // Changed from 9 to 10
const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export default function Shop() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // all | inStock | outOfStock

  // Display controls
  const [sortBy, setSortBy] = useState("recommended");
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [currentPage, setCurrentPage] = useState(1);

  // Add-to-cart feedback, keyed by product_id
  const [cartStatus, setCartStatus] = useState({});

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get("/products");
        if (res.data.success) setProducts((res.data.products || []).filter(Boolean));
      } catch (err) {
        console.error("Failed to load products:", err);
        setError("Could not load products. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const toggleCategory = (category) => {
    setCurrentPage(1);
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const clearAll = () => {
    setSelectedCategories([]);
    setPriceMin("");
    setPriceMax("");
    setStockFilter("all");
    setSortBy("recommended");
    setCurrentPage(1);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(p.category)
      ) {
        return false;
      }
      const price = Number(p.price);
      if (priceMin !== "" && price < Number(priceMin)) return false;
      if (priceMax !== "" && price > Number(priceMax)) return false;

      if (stockFilter === "inStock" && Number(p.stock) <= 0) return false;
      if (stockFilter === "outOfStock" && Number(p.stock) > 0) return false;

      return true;
    });
  }, [products, selectedCategories, priceMin, priceMax, stockFilter]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case "priceLow":
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      case "priceHigh":
        return list.sort((a, b) => Number(b.price) - Number(a.price));
      case "nameAZ":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "recommended":
      default:
        return list.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    }
  }, [filteredProducts, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const currentItems = sortedProducts.slice(startIndex, startIndex + PAGE_SIZE);

  const formatPrice = (amount) =>
    `NPR ${Number(amount).toLocaleString("en-US")}`;

  const isNewProduct = (product) => {
    if (!product.created_at) return false;
    return Date.now() - new Date(product.created_at).getTime() < NEW_WINDOW_MS;
  };

  const handleAddToCart = async (product) => {
    const token = localStorage.getItem("token");
    if (!token) {
      // Not logged in yet — keep it in the local guest cart instead of
      // losing it; it merges into their real cart once they sign in.
      setCartStatus((prev) => ({ ...prev, [product.product_id]: "adding" }));
      addToGuestCart(product, 1);
      setCartStatus((prev) => ({ ...prev, [product.product_id]: "added" }));
      toast.success("Added to cart!");
      setTimeout(() => {
        setCartStatus((prev) => ({ ...prev, [product.product_id]: null }));
      }, 1500);
      return;
    }

    setCartStatus((prev) => ({ ...prev, [product.product_id]: "adding" }));
    try {
      await api.post("/cart", { product_id: product.product_id, quantity: 1 });
      setCartStatus((prev) => ({ ...prev, [product.product_id]: "added" }));
      notifyCartUpdated();
      toast.success("Added to cart!");
      setTimeout(() => {
        setCartStatus((prev) => ({ ...prev, [product.product_id]: null }));
      }, 1500);
    } catch (err) {
      console.error("Failed to add to cart:", err);
      setCartStatus((prev) => ({ ...prev, [product.product_id]: null }));
      toast.error(err.response?.data?.message || "Could not add item to cart");
    }
  };

  const goToPage = (page) => {
    const clamped = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(clamped);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const viewedCount = Math.min(startIndex + currentItems.length, sortedProducts.length);
  const viewedPercent = sortedProducts.length
    ? Math.round((viewedCount / sortedProducts.length) * 100)
    : 0;

  return (
    <div className="shop-page">
      <Navbar />

      <div className="shop-breadcrumb">
        <span onClick={() => navigate("/")}>Home</span> / <span>Shop</span> /{" "}
        <span className="shop-breadcrumb-current">All Supplies</span>
      </div>

      <div className="shop-layout">
        {/* ---------- Sidebar filters ---------- */}
        <aside className="shop-filters">
          <div className="shop-filters-header">
            <h3>
              <FaFilter /> Filters
            </h3>
            <button className="shop-clear-all" onClick={clearAll}>
              Clear All
            </button>
          </div>

          <div className="shop-filter-group">
            <p className="shop-filter-label">Categories</p>
            {categories.length === 0 ? (
              <p className="shop-filter-empty">No categories yet</p>
            ) : (
              categories.map((category) => (
                <label className="shop-checkbox" key={category}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  {category}
                </label>
              ))
            )}
          </div>

          <div className="shop-filter-group">
            <p className="shop-filter-label">Price Range (NPR)</p>
            <div className="shop-price-inputs">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => {
                  setCurrentPage(1);
                  setPriceMin(e.target.value);
                }}
              />
              <span>-</span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => {
                  setCurrentPage(1);
                  setPriceMax(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="shop-filter-group">
            <p className="shop-filter-label">Availability</p>
            {[
              { value: "all", label: "All" },
              { value: "inStock", label: "In Stock" },
              { value: "outOfStock", label: "Out of Stock" },
            ].map((opt) => (
              <label className="shop-checkbox" key={opt.value}>
                <input
                  type="radio"
                  name="stockFilter"
                  checked={stockFilter === opt.value}
                  onChange={() => {
                    setCurrentPage(1);
                    setStockFilter(opt.value);
                  }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </aside>

        {/* ---------- Main content ---------- */}
        <main className="shop-main">
          <div className="shop-main-header">
            <div>
              <h2>Supplies for Your Furry Friends</h2>
              <p className="shop-results-count">
                {sortedProducts.length === 0
                  ? "No products found"
                  : `Showing ${startIndex + 1}-${Math.min(
                      startIndex + PAGE_SIZE,
                      sortedProducts.length
                    )} of ${sortedProducts.length} products found`}
              </p>
            </div>

            <div className="shop-main-controls">
              <div className="shop-view-toggle">
                <button
                  className={viewMode === "grid" ? "active" : ""}
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                >
                  <FaTh />
                </button>
                <button
                  className={viewMode === "list" ? "active" : ""}
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                >
                  <FaList />
                </button>
              </div>

              <select
                className="shop-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="priceLow">Price: Low to High</option>
                <option value="priceHigh">Price: High to Low</option>
                <option value="nameAZ">Name: A-Z</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="shop-status">Loading products...</p>
          ) : error ? (
            <p className="shop-status">{error}</p>
          ) : currentItems.length === 0 ? (
            <p className="shop-status">
              No products match your filters. Try clearing them.
            </p>
          ) : (
            <div className={`shop-grid ${viewMode === "list" ? "shop-grid-list" : ""}`}>
              {currentItems.map((product) => {
                const outOfStock = Number(product.stock) <= 0;
                const lowStock = !outOfStock && Number(product.stock) <= 5;
                const status = cartStatus[product.product_id];

                return (
                  <div
                    className="shop-card"
                    key={product.product_id}
                    onClick={() => product.product_id && navigate(`/product/${product.product_id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="shop-card-image">
                      {isNewProduct(product) && (
                        <span className="shop-badge shop-badge-new">New</span>
                      )}
                      {outOfStock && (
                        <span className="shop-badge shop-badge-out">
                          Out of Stock
                        </span>
                      )}
                      {lowStock && (
                        <span className="shop-badge shop-badge-low">
                          Low Stock
                        </span>
                      )}
                      {product.image_url ? (
                        <img
                          src={resolveImageSrc(product.image_url)}
                          alt={product.name}
                        />
                      ) : (
                        <div className="shop-card-noimage">No Image</div>
                      )}
                    </div>

                    <div className="shop-card-body">
                      {product.category && (
                        <p className="shop-card-category">
                          {product.category.toUpperCase()}
                        </p>
                      )}
                      <h4 className="shop-card-name">{product.name}</h4>
                      {viewMode === "list" && product.description && (
                        <p className="shop-card-description">
                          {product.description}
                        </p>
                      )}
                      <p className="shop-card-price">
                        {formatPrice(product.price)}
                      </p>

                      <button
                        className="shop-add-btn"
                        disabled={outOfStock || status === "adding"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                      >
                        <FaShoppingCart />
                        {outOfStock
                          ? "Out of Stock"
                          : status === "adding"
                          ? "Adding..."
                          : status === "added"
                          ? "Added!"
                          : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && sortedProducts.length > 0 && (
            <>
              <div className="shop-pagination">
                <button
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                >
                  <FaChevronLeft />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      className={page === safePage ? "active" : ""}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  aria-label="Next page"
                >
                  <FaChevronRight />
                </button>
              </div>

              <div className="shop-progress">
                <div className="shop-progress-track">
                  <div
                    className="shop-progress-fill"
                    style={{ width: `${viewedPercent}%` }}
                  />
                </div>
                <p>
                  You've viewed {viewedCount} out of {sortedProducts.length}{" "}
                  items
                </p>
              </div>
            </>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}