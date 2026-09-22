import type { GrillaCrucigrama, PalabraGrilla, Partida } from "../../types";
import {
  explicacionDePalabra,
  idsCandidatos,
  type PistasResueltas,
} from "./pistas";

interface PanelPistasProps {
  grilla: GrillaCrucigrama;
  pistas: PistasResueltas;
  encontradasIds: Set<string>;
  partida?: Partida | null;
  onActivarPalabra: (palabra: PalabraGrilla) => void;
}

export function PanelPistas({
  grilla,
  pistas,
  encontradasIds,
  partida,
  onActivarPalabra,
}: PanelPistasProps) {
  const horizontales = grilla.palabras
    .filter((w) => w.orientacion === "H")
    .sort((a, b) => a.numero - b.numero);
  const verticales = grilla.palabras
    .filter((w) => w.orientacion === "V")
    .sort((a, b) => a.numero - b.numero);

  function encontradaDe(w: PalabraGrilla): boolean {
    return idsCandidatos(pistas, w).some((id) => encontradasIds.has(id));
  }

  function explicacionDe(w: PalabraGrilla): string | null {
    return explicacionDePalabra(pistas, partida, w);
  }

  const items = (lista: PalabraGrilla[]) =>
    lista.map((w) => {
      const encontrada = encontradaDe(w);
      const key = `${w.numero}:${w.orientacion}`;
      return (
        <li key={key}>
          <button
            type="button"
            onClick={() => onActivarPalabra(w)}
            disabled={encontrada}
            className={`w-full text-left text-sm ${
              encontrada
                ? "text-ink-soft line-through"
                : "text-ink hover:text-amber"
            }`}
          >
            <span className="font-mono font-semibold">{w.numero}.</span>{" "}
            {explicacionDe(w) ?? "—"}
          </button>
        </li>
      );
    });

  return (
    <div className="w-full rounded-lg border border-line/20 bg-tile p-4 md:p-6 lg:w-[120%]">
      <h2 className="font-display text-lg text-ink">Pistas</h2>
      <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Horizontales
          </h3>
          <ol className="mt-2 space-y-1">
            {items(horizontales)}
            {horizontales.length === 0 && (
              <li className="text-sm text-ink-soft">Sin palabras horizontales</li>
            )}
          </ol>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Verticales
          </h3>
          <ol className="mt-2 space-y-1">
            {items(verticales)}
            {verticales.length === 0 && (
              <li className="text-sm text-ink-soft">Sin palabras verticales</li>
            )}
          </ol>
        </div>
      </div>
    </div>
  );
}