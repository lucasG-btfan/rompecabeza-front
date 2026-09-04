export type EstadoCelda = "normal" | "seleccionada" | "encontrada";

interface CeldaSopaProps {
  letra: string;
  fila: number;
  columna: number;
  estado: EstadoCelda;
}

/**
 * Una celda de la sopa de letras. El estado visual cambia según si está
 * seleccionada (intento en curso) o ya fue encontrada.
 *
 * El arrastre para seleccionar una palabra NO se maneja acá: se maneja a nivel
 * del contenedor (SopaGame), que captura el puntero y usa `elementFromPoint`
 * para saber qué celda está bajo el cursor. Por eso la celda solo expone sus
 * coordenadas (data-fila / data-col) para que el contenedor las pueda leer.
 *
 * No usamos handlers de pointer por celda porque el `touch-action: none`
 * aplicado a cada botón disparaba un implicit pointer capture en Chromium que
 * rompía el pointerenter de las celdas siguientes durante el arrastre.
 */
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
      data-fila={fila}
      data-col={columna}
      className={`${base} ${estilo}`}
    >
      {letra}
    </button>
  );
}
