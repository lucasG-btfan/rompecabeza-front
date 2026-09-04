import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import type { Usuario } from "../types";

type Modo = "logueado" | "guest";

interface AuthContextValue {
  usuario: Usuario | null;
  modo: Modo;
  /** true solo durante el chequeo inicial de sesión al abrir la app */
  cargandoSesion: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  registrar: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  limpiarError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Al abrir la app, preguntamos al backend si la cookie de sesión sigue
  // siendo válida. Si no hay cookie o expiró, /auth/me responde 401 y
  // simplemente seguimos en modo invitado (no es un error a mostrar).
  useEffect(() => {
    authApi
      .getMe()
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setCargandoSesion(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const usuarioLogueado = await authApi.login({ username, password });
      setUsuario(usuarioLogueado);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo iniciar sesión");
      throw e;
    }
  }, []);

  const registrar = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const usuarioNuevo = await authApi.registrar({ username, password });
      setUsuario(usuarioNuevo);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear la cuenta");
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUsuario(null);
  }, []);

  const limpiarError = useCallback(() => setError(null), []);

  const value: AuthContextValue = {
    usuario,
    modo: usuario ? "logueado" : "guest",
    cargandoSesion,
    error,
    login,
    registrar,
    logout,
    limpiarError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() tiene que usarse dentro de <AuthProvider>");
  }
  return ctx;
}
