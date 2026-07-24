import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Contact from "./pages/Contact";
import AuthContainer from "./containers/AuthContainer";
import UserDashboard from "./pages/Dashboard";
import OrderHistory from "./pages/OrderHistory";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./admin/layouts/AdminLayout";
import AdminDashboard from "./admin/pages/Dashboard";
import AdminProducts from "./admin/pages/Products";
import AdminCategories from "./admin/pages/Categories";
import AdminOrders from "./admin/pages/Orders";
import AdminUsers from "./admin/pages/Users";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<AuthContainer />} />

      {/* Cart is viewable by guests too (shows a local guest cart until
          they log in); Checkout still requires an account. */}
      <Route path="/cart" element={<Cart />} />

      {/* Protected: any logged-in user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/user" element={<UserDashboard />} />
        <Route path="/user/orders" element={<OrderHistory />} />
        <Route path="/checkout" element={<Checkout />} />
      </Route>

      {/* Protected: admin only */}
      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Route>
         
         <Route
    path="/payment-success"
    element={<PaymentSuccess/>}
/>

<Route
    path="/payment-failed"
    element={<PaymentFailed/>}
/>
    </Routes>
  );
}

export default App;