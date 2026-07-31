import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FaSearch,
  FaBoxes,
  FaExclamationTriangle,
  FaSyncAlt,
  FaLayerGroup,
  FaEdit,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaTrashRestore,
} from "react-icons/fa";
import api from "../../api/axios";
import ProductForm, { resolveImageSrc } from "../components/ProductForm";
import "../../styles/admin.css";

const PAGE_SIZE = 8;

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Admin listing includes soft-deleted products (unlike the public
      // /products endpoint) so deleted items can still be found and restored.
      const res = await api.get("/products/admin/all");
      if (res.data.success) setProducts((res.data.products || []).filter(Boolean));
    } catch (err) {
      console.error("Failed to load products:", err);
      setError("Could not load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, safePage]);

  const totalInventory = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0),
    [products]
  );

  const lowStockCount = useMemo(
    () => products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 10).length,
    [products]
  );

  const outOfStockCount = useMemo(
    () => products.filter((p) => Number(p.stock) <= 0).length,
    [products]
  );

  const recentlyAddedCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return products.filter((p) => p.created_at && new Date(p.created_at).getTime() >= weekAgo)
      .length;
  }, [products]);

  const categoryCount = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return set.size;
  }, [products]);

  const getStockStatus = (stockValue) => {
    const stock = Number(stockValue) || 0;
    if (stock <= 0) return { key: "out", label: "Out of Stock" };
    if (stock <= 10) return { key: "low", label: "Low Stock" };
    return { key: "in", label: "In Stock" };
  };

  const pageIds = paginatedProducts.map((p) => p.product_id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected product${selectedIds.length > 1 ? "s" : ""}? This can't be undone.`
      )
    ) {
      return;
    }

    try {
      await Promise.all(selectedIds.map((id) => api.delete(`/products/${id}`)));
      toast.success("Selected products deleted");
      clearSelection();
      loadProducts();
    } catch (err) {
      console.error("Failed to bulk delete products:", err);
      toast.error("Could not delete some products");
      loadProducts();
    }
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingProduct(null);
  };

  const handleSaved = () => {
    closeForm();
    loadProducts();
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This can't be undone.`)) {
      return;
    }

    try {
      await api.delete(`/products/${product.product_id}`);
      toast.success("Product deleted");
      loadProducts();
    } catch (err) {
      console.error("Failed to delete product:", err);
      toast.error(err.response?.data?.message || "Could not delete product");
    }
  };

  const handleRestore = async (product) => {
    try {
      await api.patch(`/products/${product.product_id}/restore`);
      toast.success(`"${product.name}" restored`);
      loadProducts();
    } catch (err) {
      console.error("Failed to restore product:", err);
      toast.error(err.response?.data?.message || "Could not restore product");
    }
  };

  const formatCurrency = (amount) =>
    `Rs. ${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  if (loading) return <div className="admin-loading">Loading products...</div>;
  if (error) return <div className="admin-loading">{error}</div>;

  const rangeStart = filteredProducts.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredProducts.length);

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <div>
          <h1>Product Management</h1>
          <p>Manage your inventory, update pricing, and track stock levels across all categories.</p>
        </div>
        <div className="admin-page-actions">
          <button className="admin-btn admin-btn-primary" onClick={openAddForm}>
            + Add New Product
          </button>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-product-searchbar">
          <div className="admin-search-with-icon">
            <FaSearch className="admin-search-icon" />
            <input
              type="text"
              placeholder="Search products by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="admin-bulk-bar">
            <span>{selectedIds.length} product{selectedIds.length > 1 ? "s" : ""} selected</span>
            <div className="admin-bulk-actions">
              <button className="admin-btn admin-btn-outline" onClick={clearSelection}>
                Clear
              </button>
              <button className="admin-btn admin-btn-danger" onClick={handleBulkDelete}>
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <p className="admin-muted">
            {products.length === 0
              ? "No products yet. Add your first one."
              : "No products match your search."}
          </p>
        ) : (
          <>
            <table className="admin-table admin-product-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAllOnPage}
                    />
                  </th>
                  <th>Image</th>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th>Inventory</th>
                  <th>Price (NPR)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => {
                  const stockInfo = getStockStatus(product.stock);
                  const isDeleted = !!product.is_deleted;
                  return (
                    <tr key={product.product_id} className={isDeleted ? "admin-row-deleted" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.product_id)}
                          onChange={() => toggleSelectOne(product.product_id)}
                          disabled={isDeleted}
                        />
                      </td>
                      <td>
                        {product.image_url ? (
                          <img
                            src={resolveImageSrc(product.image_url)}
                            alt={product.name}
                            className="admin-table-thumb"
                          />
                        ) : (
                          <div className="admin-table-thumb-placeholder">🐾</div>
                        )}
                      </td>
                      <td>
                        <div className="admin-product-name">
                          {product.name}
                          {isDeleted && (
                            <span className="category-pill admin-deleted-badge">Deleted</span>
                          )}
                        </div>
                        <div className="admin-product-sku">
                          #{String(product.product_id).padStart(3, "0")}
                        </div>
                      </td>
                      <td>
                        <span className="category-pill">{product.category || "Uncategorized"}</span>
                      </td>
                      <td>
                        <div className="inventory-cell">
                          <span className={`inventory-status inventory-status-${stockInfo.key}`}>
                            {stockInfo.label}
                          </span>
                          <span className="inventory-units">
                            {Number(product.stock) || 0} units left
                          </span>
                        </div>
                      </td>
                      <td className="admin-product-price">{formatCurrency(product.price)}</td>
                      <td>
                        <div className="admin-row-actions">
                          {isDeleted ? (
                            <button
                              className="icon-btn"
                              onClick={() => handleRestore(product)}
                              title="Restore product"
                              aria-label="Restore product"
                            >
                              <FaTrashRestore />
                            </button>
                          ) : (
                            <>
                              <button
                                className="icon-btn"
                                onClick={() => openEditForm(product)}
                                title="Edit product"
                                aria-label="Edit product"
                              >
                                <FaEdit />
                              </button>
                              <button
                                className="icon-btn danger"
                                onClick={() => handleDelete(product)}
                                title="Delete product"
                                aria-label="Delete product"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="admin-table-footer">
              <span className="admin-muted">
                Showing {rangeStart}-{rangeEnd} of {filteredProducts.length} products
              </span>
              <div className="admin-pagination">
                <button
                  className="icon-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <FaChevronLeft />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (n) =>
                      n === 1 ||
                      n === totalPages ||
                      Math.abs(n - safePage) <= 1
                  )
                  .reduce((acc, n) => {
                    if (acc.length > 0 && n - acc[acc.length - 1] > 1) acc.push("...");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, idx) =>
                    n === "..." ? (
                      <span key={`ellipsis-${idx}`} className="admin-pagination-ellipsis">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        className={`admin-pagination-page${n === safePage ? " active" : ""}`}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    )
                  )}
                <button
                  className="icon-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="admin-stats-row">
        <div className="admin-stat-card-alt">
          <div>
            <p className="stat-label">TOTAL INVENTORY</p>
            <p className="stat-value">{totalInventory.toLocaleString()} Units</p>
          </div>
          <span className="stat-icon stat-icon-orange">
            <FaBoxes />
          </span>
        </div>

        <div className="admin-stat-card-alt">
          <div>
            <p className="stat-label">LOW STOCK ITEMS</p>
            <p className="stat-value">{lowStockCount} Products</p>
          </div>
          <span className="stat-icon stat-icon-amber">
            <FaExclamationTriangle />
          </span>
        </div>

        <div className="admin-stat-card-alt">
          <div>
            <p className="stat-label">RECENT UPDATES</p>
            <p className="stat-value">{recentlyAddedCount} This Week</p>
          </div>
          <span className="stat-icon stat-icon-blue">
            <FaSyncAlt />
          </span>
        </div>

        <div className="admin-stat-card-alt">
          <div>
            <p className="stat-label">CATEGORIES</p>
            <p className="stat-value">{categoryCount} Active</p>
          </div>
          <span className="stat-icon stat-icon-green">
            <FaLayerGroup />
          </span>
        </div>
      </div>

      {outOfStockCount > 0 && (
        <p className="admin-muted admin-out-of-stock-note">
          {outOfStockCount} product{outOfStockCount > 1 ? "s are" : " is"} currently out of stock.
        </p>
      )}

      {formOpen && (
        <ProductForm
          editingProduct={editingProduct}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}