import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import { TextField } from "../components/TextField";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../store/auth";

export function Registro() {
  const navigate = useNavigate();
  const { registrar, error: errorServidor, limpiarError } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const error = errorLocal ?? errorServidor;

  function limpiarErrores() {
    setErrorLocal(null);
    if (errorServidor) limpiarError();
  }

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorLocal(null);

    if (username.trim().length < 3) {
      setErrorLocal("El usuario tiene que tener al menos 3 caracteres");
      return;
    }
    if (password.length < 6) {
      setErrorLocal("La contraseña tiene que tener al menos 6 caracteres");
      return;
    }
    if (password !== confirmacion) {
      setErrorLocal("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);
    try {
      await registrar(username.trim(), password);
      navigate("/", { replace: true });
    } catch {
      // El error del servidor (ej. username en uso) ya queda en el store.
    } finally {
      setCargando(false);
    }
  }

  return (
    <AuthCard
      titulo="Creá tu cuenta"
      subtitulo="Guardá tus partidas, tu puntaje y tu progreso."
      pie={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="font-medium text-amber underline-offset-4 hover:underline">
            Iniciá sesión
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
            limpiarErrores();
          }}
          minLength={3}
          maxLength={50}
          required
        />
        <TextField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            limpiarErrores();
          }}
          minLength={6}
          required
        />
        <TextField
          label="Repetí la contraseña"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          value={confirmacion}
          onChange={(e) => {
            setConfirmacion(e.target.value);
            limpiarErrores();
          }}
          minLength={6}
          required
        />

        {error && <p className="text-sm text-coral">{error}</p>}

        <PrimaryButton type="submit" cargando={cargando}>
          Crear cuenta
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
