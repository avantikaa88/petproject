import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/axios";

// The API base URL is "http://localhost:5000/api"; uploaded images are
// served from the server root (e.g. "http://localhost:5000/uploads/...").
const SERVER_ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");

// Resolves a product's stored image_url (a relative "/uploads/...' path)
// into a full URL that an <img> tag can load.
export const resolveImageSrc = (imageUrl) => {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${SERVER_ORIGIN}${imageUrl}`;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category: "",
  stock: "",
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB, matches server-side limit

/**
 * Add/Edit Product modal.
 *
 * Props:
 * - editingProduct: the product row being edited (from the list), or null when adding new
 * - onClose: called when the modal should close (Cancel button, overlay click)
 * - onSaved: called after a successful save, so the parent can reload its list
 */
export default function ProductForm({ editingProduct, onClose, onSaved }) {
  const editingId = editingProduct?.product_id ?? null;

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);

  // A single ordered gallery of images, existing + newly-picked.
  // Each entry: { key, image_id: number|null, url (preview), dataUrl?, isPrimary, isNew }
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef(null);

  // Categories for the dropdown, loaded once when the form mounts.
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.get("/categories");
        if (res.data?.success) setCategories(res.data.categories);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // Populate the form whenever the product being edited changes.
  useEffect(() => {
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!editingProduct) {
      setForm(EMPTY_FORM);
      setImages([]);
      return;
    }

    setForm({
      name: editingProduct.name || "",
      description: editingProduct.description || "",
      price: editingProduct.price || "",
      category: editingProduct.category || "",
      stock: editingProduct.stock || "",
    });

    // The product list doesn't include the image gallery, so fetch the
    // full product detail to get it.
    const loadImages = async () => {
      setLoadingImages(true);
      try {
        const res = await api.get(`/products/${editingProduct.product_id}`);
        const productImages = res.data?.product?.images || [];
        setImages(
          productImages.map((img) => ({
            key: img.image_id ? `existing-${img.image_id}` : "existing-legacy",
            image_id: img.image_id,
            url: resolveImageSrc(img.image_url),
            isPrimary: !!img.is_primary,
            isNew: false,
          }))
        );
      } catch (err) {
        console.error("Failed to load product images:", err);
        setImages([]);
      } finally {
        setLoadingImages(false);
      }
    };
    loadImages();
  }, [editingProduct]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageError("");

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setImageError("Please choose only JPG, PNG, GIF, or WEBP images.");
        e.target.value = "";
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setImageError("Each image must be under 5MB.");
        e.target.value = "";
        return;
      }
    }

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [
          ...prev,
          {
            key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            image_id: null,
            url: reader.result,
            dataUrl: reader.result,
            isPrimary: prev.length === 0, // first image added becomes primary by default
            isNew: true,
          },
        ]);
      };
      reader.onerror = () => {
        setImageError("Could not read one of the images. Please try again.");
      };
      reader.readAsDataURL(file);
    });

    e.target.value = ""; // allow re-selecting the same file again later
  };

  const handleSetPrimary = (key) => {
    setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.key === key })));
  };

  const handleRemoveImage = (key) => {
    setImages((prev) => {
      const next = prev.filter((img) => img.key !== key);
      // Keep exactly one primary image whenever any remain
      if (next.length > 0 && !next.some((img) => img.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (images.length === 0) {
      setImageError("Please upload at least one product image.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock) || 0,
      };

      const newEntries = images.filter((img) => img.isNew);
      const newImagesData = newEntries.map((img) => img.dataUrl);
      const primary = images.find((img) => img.isPrimary);

      if (editingId) {
        const originalIds = (editingProduct.images || []).map((img) => img.image_id ?? "legacy");
        // Fallback: if we don't have the original list yet (edge case), just
        // send no deletions rather than guessing.
        const currentExistingIds = images
          .filter((img) => !img.isNew)
          .map((img) => img.image_id ?? "legacy");
        const deleteImageIds = originalIds.filter((id) => !currentExistingIds.includes(id));

        if (newImagesData.length > 0) payload.newImages = newImagesData;
        if (deleteImageIds.length > 0) payload.deleteImageIds = deleteImageIds;

        if (primary && !primary.isNew) {
          payload.primaryImageId = primary.image_id;
        } else if (primary && primary.isNew) {
          const idxAmongNew = newEntries.findIndex((img) => img.key === primary.key);
          if (idxAmongNew >= 0) payload.primaryNewImageIndex = idxAmongNew;
        }

        await api.put(`/products/${editingId}`, payload);
        toast.success("Product updated successfully");
      } else {
        payload.images = newImagesData;
        payload.primaryIndex = primary ? newEntries.findIndex((img) => img.key === primary.key) : 0;
        await api.post("/products", payload);
        toast.success("Product added successfully");
      }

      onSaved();
    } catch (err) {
      console.error("Failed to save product:", err);
      toast.error(err.response?.data?.message || "Could not save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{editingId ? "Edit Product" : "Add Product"}</h3>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label>Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
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
            />
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Price (NPR)</label>
              <input
                type="number"
                name="price"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange}
                required
              />
            </div>

            <div className="admin-form-group">
              <label>Stock</label>
              <input
                type="number"
                name="stock"
                min="0"
                value={form.stock}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label>Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option value="">
                {loadingCategories ? "Loading categories..." : "Select a category"}
              </option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
              {/* Keeps an existing product's category selected even if it's
                  free text left over from before categories existed, or a
                  category that's since been deleted/renamed. */}
              {form.category &&
                !categories.some((cat) => cat.name === form.category) && (
                  <option value={form.category}>{form.category} (legacy)</option>
                )}
            </select>
            {!loadingCategories && categories.length === 0 && (
              <p className="admin-muted">
                No categories yet — add one from the Categories page first.
              </p>
            )}
          </div>

          <div className="admin-form-group">
            <label>Product Images</label>
            <input
              type="file"
              name="images"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImagesChange}
              ref={fileInputRef}
              multiple
            />
            {imageError && <p className="admin-field-error">{imageError}</p>}
            {loadingImages && <p className="admin-muted">Loading images...</p>}

            {images.length > 0 && (
              <div className="admin-image-gallery">
                {images.map((img) => (
                  <div
                    key={img.key}
                    className={`admin-image-thumb${img.isPrimary ? " admin-image-thumb-primary" : ""}`}
                  >
                    <img src={img.url} alt="Product" />
                    {img.isPrimary && <span className="admin-image-primary-badge">Primary</span>}
                    <div className="admin-image-thumb-actions">
                      {!img.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(img.key)}
                        >
                          Set primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.key)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}