import { Link } from "react-router-dom";
import { Wordmark } from "../components/Wordmark";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../store/auth";

export function Home() {
  const { usuario, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Wordmark />

      <div className="w-full max-w-sm rounded-lg border border-line bg-tile p-8 text-center text-ink shadow-[6px_6px_0_0_rgba(0,0,0,0.25)]">
        {usuario ? (
          <>
            <p className="font-display text-xl">Hola, {usuario.username}</p>
            <p className="mt-1 text-sm text-ink-soft">Sesión iniciada correctamente.</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link to="/dashboard">
                <PrimaryButton>Crear o jugar partidas</PrimaryButton>
              </Link>
              <Link
                to="/mis-proyectos"
                className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
              >
                Ver mis partidas →
              </Link>
            </div>
            <button
              onClick={() => logout()}
              className="mt-6 text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <p className="font-display text-xl">Estás jugando como invitado</p>
            <p className="mt-1 text-sm text-ink-soft">
              Podés jugar libremente, pero tu puntaje no se va a guardar.
            </p>
            <Link to="/login">
              <PrimaryButton className="mt-6">Iniciar sesión</PrimaryButton>
            </Link>
            <p className="mt-4 text-sm text-ink-soft">
              ¿Primera vez?{" "}
              <Link to="/registro" className="font-medium text-amber underline-offset-4 hover:underline">
                Creá una cuenta
              </Link>
            </p>
          </>
        )}
      </div>

      <div className="w-full max-w-sm rounded-lg border border-line bg-tile p-6 text-center text-ink shadow-[6px_6px_0_0_rgba(0,0,0,0.25)]">
        <p className="font-display text-xl">Jugá con otros</p>
        <p className="mt-1 text-sm text-ink-soft">
          Explorá las partidas del lobby y desafiá a alguien en 1v1.
        </p>
        <Link to="/lobby">
          <PrimaryButton className="mt-4 hover:animate-dorado-hover motion-reduce:hover:animate-none motion-reduce:hover:bg-[#B1883F]">
            Ir al lobby
          </PrimaryButton>
        </Link>
      </div>
    </div>
  );
}
