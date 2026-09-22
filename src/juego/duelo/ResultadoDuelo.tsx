import type { ResultadoDuelo as ResultadoDueloModelo, TipoPartida } from "../../types";
import { subtituloResultado, tituloResultado } from "../../utils/resultadoDuelo";
import { formatearTiempo } from "../../utils/tiempo";

interface ResultadoDueloProps {
  resultado: ResultadoDueloModelo;
  username: string;
  tipo: TipoPartida;
  partida: { codigo: string; nombre?: string | null } | null;
  onJugarOtro: () => void;
  onAbandonar: () => void;
}

export function ResultadoDuelo({
  resultado,
  username,
  tipo,
  partida,
  onJugarOtro,
  onAbandonar,
}: ResultadoDueloProps) {
  const rival = resultado.rival ?? "—";
  const perdi = resultado.gane === false;
  const empate = resultado.gane === null;

  const varianteCard = perdi
    ? "border-line bg-tile"
    : empate
      ? "border-amber/40 bg-tile"
      : "border-amber bg-amber";

  return (
    <div
      className={`flex w-full flex-col items-center gap-4 rounded-lg border p-8 text-center text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.25)] ${
        perdi || empate ? "" : "animate-win-pop"
      } ${varianteCard}`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
        Duelo {tipo === "sopa" ? "de sopa" : "de crucigrama"}
        {partida?.nombre != null ? ` · ${partida.nombre}` : ""} ·{" "}
        <span className="font-mono">{partida?.codigo ?? "—"}</span>
      </p>

      <div>
        <p className="font-display text-3xl">{tituloResultado(resultado)}</p>
        <p className="mt-2 text-sm text-ink-soft">
          {subtituloResultado(resultado, rival)}
        </p>
      </div>

      <div className="flex items-center gap-6 rounded-md border border-line bg-fondo/60 px-6 py-4 font-mono text-sm tabular-nums">
        <span className="flex flex-col items-center gap-1">
          <span className="max-w-32 truncate font-semibold text-ink">{username}</span>
          <span className="text-ink-soft">{resultado.yo_palabras} palabras</span>
        </span>
        <span className="text-ink-soft">vs</span>
        <span className="flex flex-col items-center gap-1">
          <span className="max-w-32 truncate font-semibold text-ink">{rival}</span>
          <span className="text-ink-soft">{resultado.rival_palabras} palabras</span>
        </span>
      </div>

      <p className="font-mono text-xs tabular-nums text-ink-soft">
        Tiempo total: {formatearTiempo(resultado.tiempo_total_seg)}
      </p>

      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button
          onClick={onJugarOtro}
          className="rounded-md bg-amber px-6 py-2.5 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
        >
          Jugar otro juego
        </button>
        <button
          onClick={onAbandonar}
          className="rounded-md border border-line bg-tile px-6 py-2.5 font-semibold text-ink transition-transform hover:-translate-y-0.5"
        >
          Abandonar
        </button>
      </div>
    </div>
  );
}