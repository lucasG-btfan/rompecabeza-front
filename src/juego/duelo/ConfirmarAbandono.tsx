import { useEffect, useRef } from "react";

interface ConfirmarAbandonoProps {
  rival: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmarAbandono({ rival, onConfirmar, onCancelar }: ConfirmarAbandonoProps) {
  const seguirRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    seguirRef.current?.focus();

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
      aria-labelledby="confirmar-abandono-titulo"
      aria-describedby="confirmar-abandono-copy"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="w-full max-w-sm rounded-lg border border-line bg-tile p-6 text-ink shadow-xl">
        <h2
          id="confirmar-abandono-titulo"
          className="font-display text-xl"
        >
          ¿Abandonar el duelo?
        </h2>
        <p
          id="confirmar-abandono-copy"
          className="mt-2 text-sm text-ink-soft"
        >
          Si abandonás, {rival ?? "tu rival"} gana esta partida.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            ref={seguirRef}
            onClick={onCancelar}
            className="flex-1 rounded-md border border-line bg-tile px-4 py-2.5 font-semibold text-ink transition-transform hover:-translate-y-0.5"
          >
            Seguir jugando
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 rounded-md bg-coral px-4 py-2.5 font-semibold text-white shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
          >
            Sí, abandonar
          </button>
        </div>
      </div>
    </div>
  );
}