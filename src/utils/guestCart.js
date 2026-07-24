// A very small localStorage-backed "cart" for visitors who haven't logged in
// yet. It lets them add products from the landing page / shop / product
// pages, then once they sign in or create an account,
// mergeGuestCartIntoAccount() pushes those items into their real
// (database-backed) cart and clears this local one.

import { notifyCartUpdated } from "./cartEvents";

const GUEST_CART_KEY = "guestCart";

export function getGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read guest cart:", err);
    return [];
  }
}

function saveGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  // Let other parts of the app (e.g. a cart-count badge) react to changes.
  window.dispatchEvent(new Event("guestCartUpdated"));
  notifyCartUpdated();
}

// Add a product to the guest cart, or bump its quantity if it's already
// there. `product` should have at least product_id, name, price, and
// ideally image_url/stock so the Cart page can render it nicely.
export function addToGuestCart(product, quantity = 1) {
  const items = getGuestCart();
  const stock = Number(product.stock) || 0;
  const existing = items.find((it) => it.product_id === product.product_id);

  if (existing) {
    const nextQuantity = existing.quantity + quantity;
    existing.quantity = stock > 0 ? Math.min(nextQuantity, stock) : nextQuantity;
  } else {
    items.push({
      product_id: product.product_id,
      name: product.name,
      price: product.price,
      image_url: product.image_url || null,
      stock,
      quantity: Math.max(1, quantity),
    });
  }

  saveGuestCart(items);
  return items;
}

export function updateGuestCartQuantity(product_id, quantity) {
  const items = getGuestCart().map((it) =>
    it.product_id === product_id ? { ...it, quantity } : it
  );
  saveGuestCart(items);
  return items;
}

export function removeFromGuestCart(product_id) {
  const items = getGuestCart().filter((it) => it.product_id !== product_id);
  saveGuestCart(items);
  return items;
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
  window.dispatchEvent(new Event("guestCartUpdated"));
  notifyCartUpdated();
}

export function getGuestCartCount() {
  return getGuestCart().reduce((sum, it) => sum + it.quantity, 0);
}

// Call this right after a successful login/register. Pushes every item
// sitting in the guest cart into the user's real cart via the API (using
// the shared `api` axios instance, which will already be attaching the
// freshly-saved token), then empties the guest cart.
export async function mergeGuestCartIntoAccount(api) {
  const items = getGuestCart();
  if (items.length === 0) return;

  await Promise.all(
    items.map((item) =>
      api
        .post("/cart", { product_id: item.product_id, quantity: item.quantity })
        .catch((err) => {
          console.error("Failed to merge guest cart item into account:", item, err);
        })
    )
  );

  clearGuestCart();
}