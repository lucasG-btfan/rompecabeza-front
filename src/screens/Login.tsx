import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import { TextField } from "../components/TextField";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../store/auth";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, limpiarError } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  const destino = (location.state as { from?: string } | null)?.from ?? "/";

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
      await login(username, password);
      navigate(destino, { replace: true });
    } catch {
    } finally {
      setCargando(false);
    }
  }

  return (
    <AuthCard
      titulo="Iniciá sesión"
      subtitulo="Entrá para crear partidas y guardar tu puntaje."
      pie={
        <>
          ¿Todavía no tenés cuenta?{" "}
          <Link to="/registro" className="font-medium text-amber underline-offset-4 hover:underline">
            Creá una
          </Link>
        </>
      }
    >
      <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
        <TextField
          label="Usuario"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (error) limpiarError();
          }}
          required
        />
        <TextField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) limpiarError();
          }}
          required
        />

        {error && <p className="text-sm text-coral">{error}</p>}

        <PrimaryButton type="submit" cargando={cargando}>
          Entrar
        </PrimaryButton>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        ¿Solo querés jugar?{" "}
        <Link to="/" className="font-medium text-ink underline-offset-4 hover:underline">
          Seguí como invitado
        </Link>
      </p>
    </AuthCard>
  );
}
