import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Chargement...</p>;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
