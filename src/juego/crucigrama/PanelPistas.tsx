import type { GrillaCrucigrama, PalabraGrilla, Partida } from "../../types";

/**
 * Panel de pistas del crucigrama JUGABLE (C-10, 6.4): pistas numeradas por
 * orientación (Horizontales / Verticales) con la explicacion pública de cada
 * palabra. Las encontradas se tachan y quedan deshabilitadas; el resto activa
 * la palabra al clickear vía `onActivarPalabra`.
 *
 * Componente SIN estado: recibe la grilla, los mapeos numero->id y los IDs
 * encontrados (derivados en `useCrucigramaJuego`) y la partida pública.
 */

interface PanelPistasProps {
  grilla: GrillaCrucigrama;
  idPorNumero: Map<number, string>;
  encontradasIds: Set<string>;
  partida?: Partida | null;
  onActivarPalabra: (palabra: PalabraGrilla) => void;
}

export function PanelPistas({
  grilla,
  idPorNumero,
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

  function explicacionDe(numero: number): string | null {
    const id = idPorNumero.get(numero);
    if (!id || !partida) return null;
    return partida.palabras.find((p) => p.id === id)?.explicacion ?? null;
  }

  return (
    <div className="w-full rounded-lg border border-line/20 bg-tile p-4 md:p-6 lg:w-[120%]">
      <h2 className="font-display text-lg text-ink">Pistas</h2>
      <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Horizontales
          </h3>
          <ol className="mt-2 space-y-1">
            {horizontales.map((w) => {
              const id = idPorNumero.get(w.numero);
              const encontrada = id ? encontradasIds.has(id) : false;
              return (
                <li key={w.numero}>
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
                    {explicacionDe(w.numero) ?? "—"}
                  </button>
                </li>
              );
            })}
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
            {verticales.map((w) => {
              const id = idPorNumero.get(w.numero);
              const encontrada = id ? encontradasIds.has(id) : false;
              return (
                <li key={w.numero}>
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
                    {explicacionDe(w.numero) ?? "—"}
                  </button>
                </li>
              );
            })}
            {verticales.length === 0 && (
              <li className="text-sm text-ink-soft">Sin palabras verticales</li>
            )}
          </ol>
        </div>
      </div>
    </div>
  );
}