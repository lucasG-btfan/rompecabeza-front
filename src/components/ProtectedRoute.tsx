import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";


export function ProtectedRoute() {
  const { modo } = useAuth();
  const location = useLocation();

  if (modo !== "logueado") {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}
