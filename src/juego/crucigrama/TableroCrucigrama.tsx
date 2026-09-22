import { useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import { Tablero } from "../compartido/Tablero";
import { CeldaJuego } from "./CeldaJuego";
import type { CeldaTablero } from "./logica";


interface TableroCrucigramaProps {
  tablero: CeldaTablero[][];
  letras: Map<string, string>;
  celdasActivas: Set<string>;
  celdasEncontradas: Set<string>;
  celdasError: Set<string>;
  celdaFoco: { fila: number; columna: number } | null;
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