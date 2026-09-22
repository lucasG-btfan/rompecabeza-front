import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import { useAuth } from "./store/auth";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./screens/Home";
import { Login } from "./screens/Login";
import { Registro } from "./screens/Registro";
import { Dashboard } from "./screens/Dashboard";
import { MisProyectos } from "./screens/MisProyectos";
import { EditarPartida } from "./screens/EditarPartida";
import { Jugar } from "./screens/Jugar";
import { Perfil } from "./screens/Perfil";
import { Lobby } from "./screens/Lobby";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/jugar/:codigo" element={<Jugar />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/mis-proyectos" element={<MisProyectos />} />
          <Route path="/mis-proyectos/:codigo" element={<EditarPartida />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>
      </Route>

      <Route path="*" element={<Home />} />
    </>,
  ),
);

export default function App() {
  const { cargandoSesion } = useAuth();

  if (cargandoSesion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fondo text-ink">
        <p className="font-display text-lg">Cargando…</p>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
