import type { DragEvent } from "react";

interface CeldaEditorProps {
  /** Letra a mostrar (de una palabra posicionada o del preview arrastrado). */
  letra?: string | null;
  /** Número de pista provisional (celda de inicio de una palabra). */
  numero?: number | null;
  /** Estado visual de la celda. */
  estado: "negra" | "ocupada" | "preview" | "conflicto";
  /** Motivo del conflicto (tooltip) cuando estado === "conflicto". */
  motivo?: string | null;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
}

const ESTILOS: Record<CeldaEditorProps["estado"], string> = {
  // Vacío del canvas -> celda negra (igual que la grilla final persistida).
  negra: "bg-ink/60 text-transparent",
  ocupada: "bg-tile-light text-ink",
  // Preview válido (cruce con letra coincidente): verde/ámbar.
  preview: "bg-amber text-ink",
  // Preview con conflicto (letra distinta, paralela, fantasma): rojo.
  conflicto: "bg-coral text-tile-light",
};

/**
 * Celda del editor (presentacional, prop-driven). Renderiza la letra, el
 * número de pista provisional y el color de feedback (verde válido / rojo
 * conflicto con motivo como tooltip). Recibe los handlers de drag/drop que
 * conecta `GrillaEditor`.
 */
export function CeldaEditor({
  letra,
  numero,
  estado,
  motivo,
  onDragOver,
  onDrop,
}: CeldaEditorProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      title={motivo ?? undefined}
      aria-label={motivo ?? undefined}
      className={`relative flex h-9 w-9 items-center justify-center rounded-md font-display text-lg font-semibold sm:h-11 sm:w-11 ${ESTILOS[estado]}`}
    >
      {numero != null && (
        <span className="absolute left-0.5 top-0.5 text-[9px] font-medium leading-none text-ink-soft">
          {numero}
        </span>
      )}
      <span>{letra}</span>
    </div>
  );
}