import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { isLoggedIn } = useSelector((state) => state.login);

  return isLoggedIn ? children : <Navigate to="/login" replace />;
}
