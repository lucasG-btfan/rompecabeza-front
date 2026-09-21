import type { GrillaCrucigrama, PalabraGrilla, Partida } from "../../types";
import {
  explicacionDePalabra,
  idsCandidatos,
  type PistasResueltas,
} from "./pistas";

/**
 * Panel de pistas del crucigrama JUGABLE (C-10, 6.4): pistas numeradas por
 * orientación (Horizontales / Verticales) con la explicacion pública de cada
 * palabra. Las encontradas se tachan y quedan deshabilitadas; el resto activa
 * la palabra al clickear vía `onActivarPalabra`.
 *
 * Componente SIN estado: recibe la grilla, las pistas resueltas (c-21 D2:
 * puente (numero, orientacion) -> id, en vez del viejo Map<number,string> que
 * pisaba una de las dos palabras de un par colisionante H+V con mismo inicio)
 * y los IDs encontrados (derivados en `useCrucigramaJuego`) y la partida
 * pública.
 */

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

  /** ¿Esta palabra (H/V, no el número) ya está encontrada? Resolución por
   *  palabra (R2.3): si hay candidatos y alguno está encontrado, es su id. */
  function encontradaDe(w: PalabraGrilla): boolean {
    return idsCandidatos(pistas, w).some((id) => encontradasIds.has(id));
  }

  function explicacionDe(w: PalabraGrilla): string | null {
    return explicacionDePalabra(pistas, partida, w);
  }

  const items = (lista: PalabraGrilla[]) =>
    lista.map((w) => {
      const encontrada = encontradaDe(w);
      // Clave única (numero, orientacion): dos palabras pueden compartir el
      // número (par colisionante H+V con el mismo inicio, pista QKL3K7).
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