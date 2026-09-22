import type { ReactNode } from "react";
import { Grilla } from "./Grilla";

interface TableroProps {
  filas: number;
  columnas: number;
  renderCelda: (fila: number, columna: number) => ReactNode;
}

export function Tablero({ filas, columnas, renderCelda }: TableroProps) {
  return (
    <div className="inline-block rounded-xl border border-line/20 bg-tile p-3 shadow-[6px_6px_0_0_rgba(0,0,0,0.25)]">
      <Grilla filas={filas} columnas={columnas} renderCelda={renderCelda} />
    </div>
  );
}
