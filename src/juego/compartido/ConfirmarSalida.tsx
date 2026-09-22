import { useEffect, useRef } from "react";

interface ConfirmarSalidaProps {
  
  onConfirmar: () => void;
  onCancelar: () => void;
}
export function ConfirmarSalida({ onConfirmar, onCancelar }: ConfirmarSalidaProps) {
  const botonQuedarmeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    botonQuedarmeRef.current?.focus();

    function manejarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") onCancelar();
    }
    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [onCancelar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmar-salida-titulo"
      aria-describedby="confirmar-salida-copy"
      className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/80 px-4"
    >
      <div className="w-full max-w-sm rounded-lg border border-line bg-tile p-6 text-ink shadow-xl">
        <h2
          id="confirmar-salida-titulo"
          className="font-display text-xl"
        >
          ¿Seguro que querés salir?
        </h2>
        <p
          id="confirmar-salida-copy"
          className="mt-2 text-sm text-ink-soft"
        >
          Se perderá el progreso. Si salís, esta partida vuelve a empezar desde cero.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            ref={botonQuedarmeRef}
            onClick={onCancelar}
            className="flex-1 rounded-md border border-line bg-tile px-4 py-2.5 font-semibold text-ink transition-transform hover:-translate-y-0.5"
          >
            Quedarme
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 rounded-md bg-coral px-4 py-2.5 font-semibold text-white shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}