import type { ReactNode } from "react";

interface GrillaProps {
  filas: number;
  columnas: number;
  /** Función que renderiza la celda para cada coordenada. */
  renderCelda: (fila: number, columna: number) => ReactNode;
}

/**
 * Grid genérico y reutilizable que renderiza una matriz de celdas.
 * Es la base compartida entre sopa y crucigrama: acá solo se encarga de
 * la geometría (filas × columnas); el contenido de cada celda lo decide
 * el que la usa vía `renderCelda`.
 */
export function Grilla({ filas, columnas, renderCelda }: GrillaProps) {
  return (
    <div
      className="inline-grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`,
      }}
      role="grid"
    >
      {Array.from({ length: filas }, (_, fila) =>
        Array.from({ length: columnas }, (_, columna) => (
          <div key={`${fila}-${columna}`} role="gridcell">
            {renderCelda(fila, columna)}
          </div>
        )),
      )}
    </div>
  );
}
