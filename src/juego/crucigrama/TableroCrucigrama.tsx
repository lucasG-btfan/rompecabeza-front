import type { ChangeEvent, KeyboardEvent } from "react";
import { Tablero } from "../compartido/Tablero";
import { CeldaJuego } from "./CeldaJuego";
import type { CeldaTablero } from "./logica";

/**
 * Grilla de celdas del crucigrama JUGABLE (C-10, D6): transforma la matriz
 * del tablero (`celdasDePalabraGrilla`/`armarTablero` de `logica.ts`) en
 * celdas unitarias `<CeldaJuego/>` dentro de la geometría compartida
 * `<Tablero/>` (la misma que usa la sopa).
 *
 * Componente SIN estado: toda la mecánica (auto-advance, Backspace, flechas,
 * validación) vive en `useCrucigramaJuego`, que le pasa acá los mapas de
 * estado y los handlers.
 */

interface TableroCrucigramaProps {
  tablero: CeldaTablero[][];
  letras: Map<string, string>;
  celdasActivas: Set<string>;
  celdasEncontradas: Set<string>;
  celdasError: Set<string>;
  celdaFoco: { fila: number; columna: number } | null;
  onCeldaClick: (fila: number, columna: number) => void;
  onCambio: (e: ChangeEvent<HTMLInputElement>) => void;
  onTeclado: (e: KeyboardEvent<HTMLInputElement>) => void;
}

function claveCelda(fila: number, columna: number): string {
  return `${fila},${columna}`;
}

export function TableroCrucigrama({
  tablero,
  letras,
  celdasActivas,
  celdasEncontradas,
  celdasError,
  celdaFoco,
  onCeldaClick,
  onCambio,
  onTeclado,
}: TableroCrucigramaProps) {
  const filas = tablero.length;
  const columnas = tablero[0]?.length ?? 0;

  function renderCelda(fila: number, columna: number) {
    const celda = tablero[fila]?.[columna];
    if (!celda) return null;
    if (celda.tipo === "negra") {
      return <CeldaJuego letra="" tipo="negra" activa={false} encontrada={false} tieneFoco={false} onCeldaClick={() => undefined} onCambio={() => undefined} onTeclado={() => undefined} />;
    }
    const celdaClave = claveCelda(fila, columna);
    const letra = (celda.letra ?? letras.get(celdaClave) ?? "").toUpperCase();
    const encontrada = celdasEncontradas.has(celdaClave);
    const activa = celdasActivas.has(celdaClave);
    const tieneFoco = celdaFoco?.fila === fila && celdaFoco?.columna === columna;
    return (
      <CeldaJuego
        letra={letra}
        numero={celda.numero}
        tipo="letra"
        activa={activa}
        encontrada={encontrada}
        enError={celdasError.has(celdaClave)}
        tieneFoco={tieneFoco}
        onCeldaClick={() => onCeldaClick(fila, columna)}
        onCambio={onCambio}
        onTeclado={onTeclado}
      />
    );
  }

  return <Tablero filas={filas} columnas={columnas} renderCelda={renderCelda} />;
}