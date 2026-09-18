import { Link } from "react-router-dom";
import type { PartidaLobby } from "../../types";

interface PopupProps {
  partida: PartidaLobby;
  esInvitado: boolean;
  onCerrar: () => void;
  onJugar1v1: () => void;
}

/** Popup de acciones por tarjeta del lobby (C-17, D12): "Unirse por código"
 *  (solitario) y "Jugar 1v1" (matchmaking). Presentacional. El 1v1 queda
 *  deshabilitado si la partida ya está en duelo o si el visitante es invitado
 *  (el 1v1 es solo para registrados — decisión 1 del PO). */
export default function Popup({
  partida,
  esInvitado,
  onCerrar,
  onJugar1v1,
}: PopupProps) {
  const titulo = partida.nombre ?? partida.codigo;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={`Opciones de ${titulo}`}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-5 rounded-lg border border-line bg-tile p-6 text-ink shadow-[6px_6px_0_0_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">{titulo}</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {partida.cantidad_palabras} palabras · código{" "}
              <span className="font-mono tracking-widest">{partida.codigo}</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onCerrar}
            className="text-xl leading-none text-ink-soft transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            to={`/jugar/${partida.codigo}`}
            className="rounded-md bg-amber px-4 py-2.5 text-center font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
          >
            Unirse por código
          </Link>

          <button
            type="button"
            onClick={onJugar1v1}
            disabled={partida.en_duelo || esInvitado}
            className="rounded-md border-2 border-ink/10 bg-tile-light px-4 py-2.5 font-semibold text-ink transition-colors hover:border-amber disabled:cursor-not-allowed disabled:opacity-50"
          >
            Jugar 1v1
          </button>

          {partida.en_duelo && (
            <p className="text-xs text-ink-soft">
              Esta partida ya tiene un duelo en curso.
            </p>
          )}

          {esInvitado && (
            <p className="text-xs text-ink-soft">
              Necesitás{" "}
              <Link to="/login" className="font-medium text-amber underline-offset-4 hover:underline">
                iniciar sesión
              </Link>{" "}
              para jugar 1v1.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}