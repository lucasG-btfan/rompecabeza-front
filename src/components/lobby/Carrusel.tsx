import type { PartidaLobby } from "../../types";
import { anteriorIndice, siguienteIndice } from "../../utils/carrusel";
import { etiquetaTipo } from "../../utils/tipoPartida";

interface CarruselProps {
  partidas: PartidaLobby[];
  indice: number;
  onCambiarIndice: (indice: number) => void;
  onSeleccionar: (partida: PartidaLobby) => void;
}

/** Carrusel del lobby (C-17, D11/D12): presenta la tarjeta activa + flechas
 *  con wrap-around (lógica pura en `utils/carrusel.ts`). Presentacional. */
export default function Carrusel({
  partidas,
  indice,
  onCambiarIndice,
  onSeleccionar,
}: CarruselProps) {
  if (partidas.length === 0) return null;

  const partida = partidas[indice];
  const titulo = partida.nombre ?? partida.codigo;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Partida anterior"
          onClick={() => onCambiarIndice(anteriorIndice(indice, partidas.length))}
          className="grid h-10 w-10 place-items-center rounded-md border border-line bg-tile-light text-xl text-ink transition-colors hover:border-amber disabled:opacity-40"
          disabled={partidas.length <= 1}
        >
          ‹
        </button>

        <button
          type="button"
          onClick={() => onSeleccionar(partida)}
          className="flex-1 cursor-pointer rounded-lg border border-line bg-tile p-6 text-left text-ink shadow-[6px_6px_0_0_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5"
          aria-label={`Ver opciones de ${titulo}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-xl">{titulo}</span>
            {partida.en_duelo && (
              <span className="rounded-full bg-amber px-2 py-0.5 text-xs font-semibold text-ink">
                en duelo
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {etiquetaTipo(partida.tipo)} · {partida.cantidad_palabras}{" "}
            {partida.cantidad_palabras === 1 ? "palabra" : "palabras"}
          </p>
        </button>

        <button
          type="button"
          aria-label="Partida siguiente"
          onClick={() => onCambiarIndice(siguienteIndice(indice, partidas.length))}
          className="grid h-10 w-10 place-items-center rounded-md border border-line bg-tile-light text-xl text-ink transition-colors hover:border-amber disabled:opacity-40"
          disabled={partidas.length <= 1}
        >
          ›
        </button>
      </div>

      <p className="text-center font-mono text-xs text-ink-soft">
        {indice + 1}/{partidas.length}
      </p>
    </div>
  );
}