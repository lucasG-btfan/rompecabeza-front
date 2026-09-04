import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Wordmark } from "./Wordmark";
import { useAuth } from "../store/auth";

/** Enlace de navegación que resalta la ruta activa. */
function NavLinkItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors ${
          isActive ? "text-ink" : "text-ink-soft hover:text-ink"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export function Layout() {
  const { usuario, modo, logout } = useAuth();
  const navigate = useNavigate();

  async function manejarSalir() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-fondo text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-4">
          <Link to="/" aria-label="Ir al inicio">
            <Wordmark />
          </Link>

          <nav className="flex items-center gap-8">
            {modo === "logueado" && (
              <div className="flex items-center gap-6">
                <NavLinkItem to="/dashboard">Dashboard</NavLinkItem>
                <NavLinkItem to="/mis-proyectos">Mis partidas</NavLinkItem>
                <NavLinkItem to="/perfil">Perfil</NavLinkItem>
              </div>
            )}

            {modo === "logueado" ? (
              <div className="flex items-center gap-4 border-l border-line pl-6">
                <span className="text-sm font-semibold text-ink">
                  {usuario?.username}
                </span>
                <button
                  onClick={manejarSalir}
                  className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  Salir
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                Iniciar sesión
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
