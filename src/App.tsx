import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export default function App() {
  const { cargandoSesion } = useAuth();

  // Mientras revisamos si la cookie de sesión sigue válida, no decidimos
  // a dónde mandar a nadie (evita un parpadeo de "invitado" en rutas protegidas).
  if (cargandoSesion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fondo text-ink">
        <p className="font-display text-lg">Cargando…</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Layout envuelve las rutas que comparten Header/navegación.
          Las pantallas de auth (login/registro) van fuera para no mostrar header. */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/jugar/:codigo" element={<Jugar />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mis-proyectos" element={<MisProyectos />} />
            <Route path="/mis-proyectos/:codigo" element={<EditarPartida />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>
        </Route>

        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
