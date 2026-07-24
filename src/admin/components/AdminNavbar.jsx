import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "../../styles/admin.css";

export default function Navbar({ admin }) {
  const navigate = useNavigate();
  const boxRef = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const initials = admin?.full_name
    ? admin.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "A";

  // Debounced live search against the products the admin has added,
  // hitting the same GET /products?search= endpoint the public store uses.
  useEffect(() => {
    const term = query.trim();

    if (!term) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get("/products", { params: { search: term } });
        if (res.data.success) setResults(res.data.products.slice(0, 6));
      } catch (err) {
        console.error("Product search failed:", err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Close the dropdown when clicking anywhere outside the search box
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToProductsPage = (term) => {
    setOpen(false);
    navigate(`/admin/products?search=${encodeURIComponent(term)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      goToProductsPage(query.trim());
    }
  };

  const formatCurrency = (amount) =>
    `Rs. ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <header className="admin-navbar">
      <div className="admin-navbar-left">
        <h2>Admin Dashboard</h2>
      </div>

      <div className="admin-navbar-right">
        <div className="admin-search-wrap" ref={boxRef}>
          <input
            type="text"
            placeholder="Search products..."
            className="admin-search-box"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => query.trim() && setOpen(true)}
            onKeyDown={handleKeyDown}
          />

          {open && query.trim() && (
            <div className="admin-search-dropdown">
              {searching ? (
                <div className="admin-search-empty">Searching...</div>
              ) : results.length === 0 ? (
                <div className="admin-search-empty">
                  No products found for "{query.trim()}"
                </div>
              ) : (
                <>
                  {results.map((product) => (
                    <button
                      key={product.product_id}
                      className="admin-search-result"
                      onClick={() => goToProductsPage(product.name)}
                    >
                      <span className="admin-search-result-name">
                        {product.name}
                      </span>
                      <span className="admin-search-result-meta">
                        {product.category || "Uncategorized"} ·{" "}
                        {formatCurrency(product.price)}
                      </span>
                    </button>
                  ))}
                  <button
                    className="admin-search-viewall"
                    onClick={() => goToProductsPage(query.trim())}
                  >
                    View all results for "{query.trim()}"
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="admin-profile">
          <div className="admin-avatar">{initials}</div>
          <span className="admin-name">{admin?.full_name || "Loading..."}</span>
        </div>
      </div>
    </header>
  );
}