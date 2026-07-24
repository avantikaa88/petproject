// A tiny pub/sub so parts of the app that don't directly render the cart
// (like the Navbar's cart-count badge) can still react whenever the cart's
// contents change -- whether that change came from the guest (localStorage)
// cart or the logged-in (database) cart.
export const CART_UPDATED_EVENT = "cartUpdated";

export function notifyCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}