import type { TipoPartida } from "../types";
import type { FilaPalabra } from "../utils/filasPalabras";

interface Props {
  filas: FilaPalabra[];
  tipo: TipoPartida;
  onCambiarFila: (indice: number, cambio: Partial<FilaPalabra>) => void;
  onAgregarFila: () => void;
  onQuitarFila: (indice: number) => void;
}

export function ListaPalabrasInput({
  filas,
  tipo,
  onCambiarFila,
  onAgregarFila,
  onQuitarFila,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {filas.map((fila, indice) => (
          <div
            key={indice}
            className="flex items-start gap-2 rounded-md border border-line/30 bg-tile-light p-2"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <input
                type="text"
                value={fila.palabra}
                maxLength={50}
                onChange={(e) => onCambiarFila(indice, { palabra: e.target.value })}
                placeholder="Ej: CO-AUTOR"
                className="w-full rounded-md border-2 border-ink/10 bg-white/60 px-3 py-2 text-sm font-semibold uppercase text-ink placeholder:normal-case placeholder:font-normal placeholder:text-ink-soft/50 outline-none transition-colors focus:border-amber"
              />
              {tipo === "crucigrama" && (
                <input
                  type="text"
                  value={fila.explicacion}
                  maxLength={200}
                  onChange={(e) =>
                    onCambiarFila(indice, { explicacion: e.target.value })
                  }
                  placeholder="Pista (opcional)"
                  className="w-full rounded-md border border-ink/10 bg-white/40 px-3 py-1.5 text-sm text-ink-soft placeholder:text-ink-soft/50 outline-none transition-colors focus:border-amber"
                />
              )}
            </div>

            <button
              type="button"
              aria-label={tipo === "crucigrama" ? "Quitar palabra y pista" : "Quitar palabra"}
              disabled={filas.length <= 1}
              onClick={() => onQuitarFila(indice)}
              className="shrink-0 rounded-md border border-line/30 px-2.5 py-1.5 text-sm font-bold text-ink-soft transition-colors hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line/30 disabled:hover:text-ink-soft"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAgregarFila}
        className="w-full rounded-md border-2 border-dashed border-line/40 px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-amber hover:text-ink"
      >
        + Agregar palabra
      </button>
    </div>
  );
}
