import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

/**
 * Route guard component:
 * - Redirects unauthenticated users to /login
 * - Redirects non-admin users to /dashboard when accessing admin-only routes
 */
function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;