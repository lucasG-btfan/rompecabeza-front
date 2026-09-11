export type EstadoCelda = "normal" | "seleccionada" | "encontrada";

interface CeldaSopaProps {
  letra: string;
  fila: number;
  columna: number;
  estado: EstadoCelda;
}


export function CeldaSopa({ letra, fila, columna, estado }: CeldaSopaProps) {
  const base =
    "flex h-9 w-9 select-none items-center justify-center rounded-md font-display text-lg font-semibold transition-colors sm:h-11 sm:w-11 text-ink";
  const estilo =
    estado === "encontrada"
      ? "bg-amber text-ink"
      : estado === "seleccionada"
        ? "bg-coral text-ink"
        : "bg-tile-light text-ink";

  return (
    <button
      type="button"
      className={`${base} ${estilo}`}
      data-fila={fila}
      data-columna={columna}
    >
      {letra}
    </button>
  );
}
