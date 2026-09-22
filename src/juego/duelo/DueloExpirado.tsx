import {
  subtituloDueloExpirado,
  tituloDueloExpirado,
} from "../../utils/resultadoDuelo";

interface DueloExpiradoProps {
  onJugarOtro: () => void;
  onAbandonar: () => void;
}


export function DueloExpirado({ onJugarOtro, onAbandonar }: DueloExpiradoProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-lg border border-line bg-tile p-8 text-center text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.25)]">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
        Duelo 1v1
      </p>

      <div>
        <p className="font-display text-3xl">{tituloDueloExpirado()}</p>
        <p className="mt-2 text-sm text-ink-soft">{subtituloDueloExpirado()}</p>
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button
          onClick={onJugarOtro}
          className="rounded-md bg-amber px-6 py-2.5 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
        >
          Jugar otro juego
        </button>
        <button
          onClick={onAbandonar}
          className="rounded-md border border-line bg-fondo/60 px-6 py-2.5 font-semibold text-ink transition-transform hover:-translate-y-0.5"
        >
          Abandonar
        </button>
      </div>
    </div>
  );
}