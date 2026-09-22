import type { DragEvent } from "react";

interface CeldaEditorProps {
  letra?: string | null;
  numero?: number | null;
  estado: "negra" | "ocupada" | "preview" | "conflicto";
  motivo?: string | null;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
}

const ESTILOS: Record<CeldaEditorProps["estado"], string> = {
  negra: "bg-ink/60 text-transparent",
  ocupada: "bg-tile-light text-ink",
  preview: "bg-amber text-ink",

  conflicto: "bg-coral text-tile-light",
};


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