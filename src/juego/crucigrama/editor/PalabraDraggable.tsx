import type { DragEvent } from "react";
import type { OrientacionCrucigrama } from "../../../types";

interface PalabraDraggableProps {
  palabraId: string;
  texto: string;
  etiqueta: string | null;
  orientacion: OrientacionCrucigrama;
  posicionada: boolean;
  onToggleOrientacion: (palabraId: string) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, palabraId: string, orientacion: OrientacionCrucigrama) => void;
  onQuitar: (palabraId: string) => void;
}


export function PalabraDraggable({
  palabraId,
  texto,
  etiqueta,
  orientacion,
  posicionada,
  onToggleOrientacion,
  onDragStart,
  onQuitar,
}: PalabraDraggableProps) {
  function manejarDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ palabra_id: palabraId, orientacion }));
    onDragStart(e, palabraId, orientacion);
  }

  return (
    <li
      className={`flex items-center gap-2 rounded-lg border border-line bg-tile px-3 py-2 ${
        posicionada ? "opacity-60" : ""
      }`}
    >
      <div
        draggable
        onDragStart={manejarDragStart}
        className="flex cursor-grab items-center gap-1 rounded-md bg-tile-light px-2 py-1 active:cursor-grabbing"
        title="Arrastrá al tablero para posicionar"
      >
        {[...texto].map((letra, i) => (
          <span
            key={i}
            className={`flex h-6 w-6 items-center justify-center rounded font-display text-sm font-semibold ${
              posicionada ? "text-ink-soft" : "text-ink"
            }`}
          >
            {letra}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onToggleOrientacion(palabraId)}
        className="rounded-md border border-line bg-tile-light px-2 py-1 text-xs font-medium text-ink"
        title="Cambiar orientación"
      >
        {orientacion === "H" ? "Horizontal" : "Vertical"}
      </button>

      <span className="truncate text-xs text-ink-soft">
        {etiqueta}
        {posicionada ? " · posicionada" : ""}
      </span>

      {posicionada && (
        <button
          type="button"
          onClick={() => onQuitar(palabraId)}
          className="ml-auto rounded-md border border-coral/40 px-2 py-1 text-xs font-medium text-coral transition-colors hover:border-coral/70"
          title="Quitar la posición del tablero"
        >
          Sacar
        </button>
      )}
    </li>
  );
}