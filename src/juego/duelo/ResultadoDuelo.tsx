import type { ResultadoDuelo as ResultadoDueloModelo, TipoPartida } from "../../types";
import { subtituloResultado, tituloResultado } from "../../utils/resultadoDuelo";
import { formatearTiempo } from "../../utils/tiempo";

interface ResultadoDueloProps {
  /** Resultado normalizado para ESTE jugador (D5). */
  resultado: ResultadoDueloModelo;
  /** Username del jugador local (marcador del "yo"). */
  username: string;
  tipo: TipoPartida;
  /** Nombre/código de la partida (para el encabezado del card). */
  partida: { codigo: string; nombre?: string | null } | null;
  onVolverInicio: () => void;
}

/**
 * Pantalla de resultado del duelo 1v1 (C-19, D11 — presentacional).
 *
 * Variantes visuales del design D11: ganador festiva (bg-amber +
 * `animate-win-pop` + emojis en el título, ya en el copy), perdedor sobria
 * (bg-tile + border-line, sin animación) y empate neutral (bg-tile +
 * border-amber/40). El copy exacto viene de `resultadoDuelo.ts` (probado con
 * vitest); este componente solo lo ubica en la card con los marcadores
 * `{username} — {yo_palabras}` vs `{rival} — {rival_palabras}` y el footer de
 * tiempo total (formatearTiempo, util existente).
 */
export function ResultadoDuelo({
  resultado,
  username,
  tipo,
  partida,
  onVolverInicio,
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

      <button
        onClick={onVolverInicio}
        className="mt-2 rounded-md bg-amber px-6 py-2.5 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
      >
        Volver al inicio
      </button>
    </div>
  );
}