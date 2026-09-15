import { useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import { Tablero } from "../compartido/Tablero";
import { CeldaJuego } from "./CeldaJuego";
import type { CeldaTablero } from "./logica";

/**
 * Grilla de celdas del crucigrama JUGABLE (C-10, D6; C-12, D4/D5): transforma
 * la matriz del tablero (`celdasDePalabraGrilla`/`armarTablero` de `logica.ts`)
 * en celdas unitarias `<CeldaJuego/>` dentro de la geometría compartida
 * `<Tablero/>` (la misma que usa la sopa).
 *
 * Presentacional con DOS responsabilidades de UI (C-12):
 * - scroll a la celda activa cuando cambia `celdaFoco` (teclado virtual
 *   mobile tapa la grilla, D5);
 * - clase `animate-found` en las celdas de la palabra recién encontrada
 *   (`palabraResaltada` resuelta a claves por el container, D4).
 *
 * Sin estado de juego: la mecánica vive en `useCrucigramaJuego`.
 */

interface TableroCrucigramaProps {
  tablero: CeldaTablero[][];
  letras: Map<string, string>;
  celdasActivas: Set<string>;
  celdasEncontradas: Set<string>;
  celdasError: Set<string>;
  celdaFoco: { fila: number; columna: number } | null;
  /** Claves "fila,columna" de la palabra resaltada (C-12/D4, highlight). */
  celdasResaltadas: ReadonlySet<string>;
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
  celdasResaltadas,
  onCeldaClick,
  onCambio,
  onTeclado,
}: TableroCrucigramaProps) {
  const filas = tablero.length;
  const columnas = tablero[0]?.length ?? 0;

  // Scroll a la celda activa (C-12/D5): al cambiar el foco (click, flechas o
  // auto-advance) la celda se centra en el viewport — sin esto el teclado
  // virtual mobile tapa la fila que se está escribiendo.
  useEffect(() => {
    if (!celdaFoco) return;
    document
      .getElementById(`celda-${celdaFoco.fila}-${celdaFoco.columna}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [celdaFoco]);

  function renderCelda(fila: number, columna: number) {
    const celda = tablero[fila]?.[columna];
    if (!celda) return null;
    if (celda.tipo === "negra") {
      return (
        <CeldaJuego
          fila={fila}
          columna={columna}
          letra=""
          tipo="negra"
          activa={false}
          encontrada={false}
          tieneFoco={false}
          onCeldaClick={() => undefined}
          onCambio={() => undefined}
          onTeclado={() => undefined}
        />
      );
    }
    const celdaClave = claveCelda(fila, columna);
    const letra = (celda.letra ?? letras.get(celdaClave) ?? "").toUpperCase();
    const encontrada = celdasEncontradas.has(celdaClave);
    const activa = celdasActivas.has(celdaClave);
    const tieneFoco = celdaFoco?.fila === fila && celdaFoco?.columna === columna;
    return (
      <CeldaJuego
        fila={fila}
        columna={columna}
        letra={letra}
        numero={celda.numero}
        tipo="letra"
        activa={activa}
        encontrada={encontrada}
        enError={celdasError.has(celdaClave)}
        resaltada={celdasResaltadas.has(celdaClave)}
        tieneFoco={tieneFoco}
        onCeldaClick={() => onCeldaClick(fila, columna)}
        onCambio={onCambio}
        onTeclado={onTeclado}
      />
    );
  }

  return <Tablero filas={filas} columnas={columnas} renderCelda={renderCelda} />;
}