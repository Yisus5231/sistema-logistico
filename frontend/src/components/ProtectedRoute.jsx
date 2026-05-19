import { Navigate } from "react-router-dom";
import api from "../api";

export default function ProtectedRoute({ children, roles }) {
  const token = api.getToken();
  const user = api.getUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.some(r => r.toLowerCase() === user.rol?.toLowerCase())) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
