import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FaSearch, FaTags, FaBoxOpen, FaLayerGroup } from "react-icons/fa";
import api from "../../api/axios";
import { resolveImageSrc } from "../components/ProductForm";
import "../../styles/admin.css";

const EMPTY_FORM = { name: "", description: "" };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = adding new
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  // All products, loaded once so we can show each category's products
  // without an extra API call every time an admin clicks into one.
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // The category currently being viewed in the "products in this category" modal
  const [viewingCategory, setViewingCategory] = useState(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/categories");
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
      setError("Could not load categories.");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await api.get("/products");
      if (res.data.success) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  // Group products by their category name, so a category's product list
  // and count are just a lookup away instead of a fresh request.
  const productsByCategory = useMemo(() => {
    const map = {};
    for (const product of products) {
      const key = product.category || "";
      if (!map[key]) map[key] = [];
      map[key].push(product);
    }
    return map;
  }, [products]);

  const getProductCount = (categoryName) =>
    (productsByCategory[categoryName] || []).length;

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [categories, search]);

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  const openAddForm = () => {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (category) => {
    setEditingCategory(category);
    setForm({ name: category.name || "", description: category.description || "" });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setForm(EMPTY_FORM);
  };

  const openViewProducts = (category) => {
    setViewingCategory(category);
  };

  const closeViewProducts = () => {
    setViewingCategory(null);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.category_id}`, form);
        toast.success("Category updated");
      } else {
        await api.post("/categories", form);
        toast.success("Category added");
      }
      closeForm();
      loadCategories();
    } catch (err) {
      console.error("Failed to save category:", err);
      toast.error(err.response?.data?.message || "Could not save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    if (
      !window.confirm(
        `Delete category "${category.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(category.category_id);
    try {
      await api.delete(`/categories/${category.category_id}`);
      setCategories((prev) =>
        prev.filter((c) => c.category_id !== category.category_id)
      );
      toast.success("Category deleted");
    } catch (err) {
      console.error("Failed to delete category:", err);
      toast.error(err.response?.data?.message || "Could not delete category");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="admin-loading">Loading categories...</div>;
  if (error) return <div className="admin-loading">{error}</div>;

  const totalProductsAcrossCategories = products.length;
  const emptyCategoryCount = categories.filter(
    (c) => getProductCount(c.name) === 0
  ).length;

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <div>
          <h1>Category Management</h1>
          <p>Organize your catalog and see how many products live in each category.</p>
        </div>
        <div className="admin-page-actions">
          <button className="admin-btn admin-btn-primary" onClick={openAddForm}>
            + Add Category
          </button>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-product-searchbar">
          <div className="admin-search-with-icon">
            <FaSearch className="admin-search-icon" />
            <input
              type="text"
              placeholder="Search by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <p className="admin-muted">
            {categories.length === 0
              ? "No categories yet. Add one to get started."
              : "No categories match your search."}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Products</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category.category_id}>
                  <td>#{category.category_id}</td>
                  <td>
                    <span className="category-pill">{category.name}</span>
                  </td>
                  <td className="admin-address-cell" title={category.description || ""}>
                    {category.description || "—"}
                  </td>
                  <td>
                    <button
                      className="admin-btn admin-btn-outline"
                      onClick={() => openViewProducts(category)}
                      disabled={loadingProducts}
                    >
                      {loadingProducts
                        ? "..."
                        : `View Products (${getProductCount(category.name)})`}
                    </button>
                  </td>
                  <td>{formatDate(category.created_at)}</td>
                  <td>
                    <button
                      className="admin-btn admin-btn-outline"
                      onClick={() => openEditForm(category)}
                    >
                      Edit
                    </button>{" "}
                    <button
                      className="admin-btn admin-btn-danger"
                      disabled={deletingId === category.category_id}
                      onClick={() => handleDelete(category)}
                    >
                      {deletingId === category.category_id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-stats-row">
        <div className="admin-stat-card-alt">
          <div>
            <p className="stat-label">TOTAL CATEGORIES</p>
            <p className="stat-value">{categories.length} Active</p>
          </div>
          <span className="stat-icon stat-icon-green">
            <FaLayerGroup />
          </span>
        </div>

        <div className="admin-stat-card-alt">
          <div>
            <p className="stat-label">TOTAL PRODUCTS</p>
            <p className="stat-value">{totalProductsAcrossCategories} Listed</p>
          </div>
          <span className="stat-icon stat-icon-orange">
            <FaBoxOpen />
          </span>
        </div>

        <div className="admin-stat-card-alt">
          <div>
            <p className="stat-label">EMPTY CATEGORIES</p>
            <p className="stat-value">{emptyCategoryCount} Need Products</p>
          </div>
          <span className="stat-icon stat-icon-amber">
            <FaTags />
          </span>
        </div>
      </div>

      {showForm && (
        <div className="admin-modal-overlay" onClick={closeForm}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingCategory ? "Edit Category" : "Add Category"}</h3>

            <form onSubmit={handleSubmit}>
              <div className="admin-form-group">
                <label>Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Dog Food, Toys, Grooming"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Optional short description"
                />
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={closeForm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingCategory && (
        <div className="admin-modal-overlay" onClick={closeViewProducts}>
          <div
            className="admin-modal admin-modal-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-category-modal-header">
              <div>
                <h3>{viewingCategory.name}</h3>
                {viewingCategory.description && (
                  <p className="admin-muted admin-category-modal-desc">
                    {viewingCategory.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={closeViewProducts}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {(() => {
              const categoryProducts = productsByCategory[viewingCategory.name] || [];

              if (loadingProducts) {
                return <p className="admin-muted">Loading products...</p>;
              }

              if (categoryProducts.length === 0) {
                return (
                  <div className="admin-category-empty-state">
                    <span className="admin-category-empty-icon">📦</span>
                    <p className="admin-muted">
                      No products have been added to this category yet.
                    </p>
                  </div>
                );
              }

              return (
                <div className="admin-category-products-grid">
                  {categoryProducts.map((product) => {
                    const outOfStock = Number(product.stock) <= 0;
                    const lowStock = !outOfStock && Number(product.stock) <= 5;

                    return (
                      <div key={product.product_id} className="admin-category-product-card">
                        <div className="admin-category-product-image-wrap">
                          {product.image_url ? (
                            <img
                              src={resolveImageSrc(product.image_url)}
                              alt={product.name}
                              className="admin-category-product-image"
                            />
                          ) : (
                            <div className="admin-category-product-image-placeholder">
                              🐾
                            </div>
                          )}
                          <span
                            className={`admin-stock-pill${
                              outOfStock
                                ? " admin-stock-pill-out"
                                : lowStock
                                ? " admin-stock-pill-low"
                                : " admin-stock-pill-ok"
                            }`}
                          >
                            {outOfStock ? "Out of stock" : `${product.stock} in stock`}
                          </span>
                        </div>

                        <div className="admin-category-product-body">
                          <h4 className="admin-category-product-name" title={product.name}>
                            {product.name}
                          </h4>
                          <p className="admin-category-product-price">
                            NPR {Number(product.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={closeViewProducts}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}