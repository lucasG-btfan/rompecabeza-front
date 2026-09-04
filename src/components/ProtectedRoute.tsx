import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";

/**
 * Envuelve rutas que exigen estar logueados (crear partidas, mis partidas,
 * editar, perfil). Si el visitante es invitado, lo manda a iniciar sesión
 * recordando a dónde quería ir (para volver después de loguearse).
 */
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
