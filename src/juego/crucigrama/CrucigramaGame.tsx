import { useMemo } from "react";
import type { EstadoPartida, Partida, ResultadoDuelo } from "../../types";
import { useCrucigramaJuego } from "./useCrucigramaJuego";
import { TableroCrucigrama } from "./TableroCrucigrama";
import { PanelPistas } from "./PanelPistas";
import { celdasDePalabraGrilla } from "./logica";
import { clavePista } from "./pistas";

/**
 * Container delgado del modo crucigrama JUGABLE (C-10, D4).
 *
 * Recibe del padre (`Jugar.tsx`) los props de la partida y delega TODO el
 * estado y la mecánica a `useCrucigramaJuego`. La presentación se divide en
 * `TableroCrucigrama` (grilla de celdas) y `PanelPistas` (pistas numeradas).
 * Si el backend no devuelve crucigrama (`grilla` null), renderiza nada.
 */

export interface CrucigramaGameProps {
  codigo: string;
  estado: EstadoPartida;
  /** Vista pública de la partida: pistas (explicacion) numeradas. */
  partida?: Partida | null;
  /** C-19 (D3/D5): segundo parámetro = `duelo_finalizado` si la jugada cortó. */
  onPalabraEncontrada?: (
    palabraId: string,
    dueloFinalizado?: ResultadoDuelo | null,
  ) => void;
  onProgreso?: (encontradas: number, total: number) => void;
}

export function CrucigramaGame({
  codigo,
  estado,
  partida,
  onPalabraEncontrada,
  onProgreso,
}: CrucigramaGameProps) {
  const juego = useCrucigramaJuego({ codigo, estado, onPalabraEncontrada, onProgreso });

  // Celdas de la palabra recién encontrada (C-12/D4): el hook expone la CLAVE
  // (numero, orientacion) — c-21: en un par colisionante dos palabras
  // comparten numero, así que la clave desambigua cuál resaltar; acá se
  // resuelve a claves "fila,columna" con la geometría de la grilla (función
  // pura, vitest) para que el tablero aplique `animate-found`.
  const celdasResaltadas = useMemo(() => {
    if (!juego.grilla || juego.palabraResaltada == null) return new Set<string>();
    const palabra = juego.grilla.palabras.find(
      (w) => clavePista(w.numero, w.orientacion) === juego.palabraResaltada,
    );
    if (!palabra) return new Set<string>();
    return new Set(celdasDePalabraGrilla(palabra).map((c) => `${c.fila},${c.columna}`));
  }, [juego.grilla, juego.palabraResaltada]);

  if (!juego.grilla) {
    return null;
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <TableroCrucigrama
        tablero={juego.tablero}
        letras={juego.letras}
        celdasActivas={juego.celdasActivas}
        celdasEncontradas={juego.celdasEncontradas}
        celdasError={juego.celdasError}
        celdaFoco={juego.celdaFoco}
        celdasResaltadas={celdasResaltadas}
        onCeldaClick={juego.manejarClickCelda}
        onCambio={juego.manejarCambio}
        onTeclado={juego.manejarTeclado}
      />

      <p className="max-w-sm text-center text-xs text-ink-soft">
        Hacé click en una celda para elegir la palabra. Escribí para completar,
        Backspace borra, Enter valida y Tab cambia de palabra.
      </p>

      {juego.error && <p className="max-w-sm text-center text-sm text-coral">{juego.error}</p>}

      <PanelPistas
        grilla={juego.grilla}
        pistas={juego.pistas}
        encontradasIds={juego.encontradasIds}
        partida={partida}
        onActivarPalabra={juego.activarPalabra}
      />
    </div>
  );
}