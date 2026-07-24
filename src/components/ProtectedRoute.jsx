import { Navigate, Outlet } from "react-router-dom";

// Wrap any <Route> group with this to require login (and optionally a
// specific role, e.g. "admin"). Reads from localStorage, which is set
// during login/register in AuthContainer.jsx.
function ProtectedRoute({ requiredRole }) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Logged in, but not allowed here (e.g. a customer trying to hit /admin)
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;