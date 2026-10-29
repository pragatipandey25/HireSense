import { Navigate } from "react-router-dom";
import { isTokenExpired } from "../utils/jwt";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // No token or user → redirect to login
  if (!token || !user) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/" replace />;
  }

  // Check if token is expired
  if (isTokenExpired(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/" replace />;
  }

  // Role mismatch → redirect to appropriate role dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectMap = {
      candidate: "/candidate-dashboard",
      employer: "/employer-dashboard",
      admin: "/admin-dashboard",
    };
    return <Navigate to={redirectMap[user.role] || "/"} replace />;
  }

  return children;
};

export default ProtectedRoute;
