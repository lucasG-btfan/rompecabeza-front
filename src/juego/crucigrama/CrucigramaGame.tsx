import { useMemo } from "react";
import type { EstadoPartida, Partida, ResultadoDuelo } from "../../types";
import { useCrucigramaJuego } from "./useCrucigramaJuego";
import { TableroCrucigrama } from "./TableroCrucigrama";
import { PanelPistas } from "./PanelPistas";
import { celdasDePalabraGrilla } from "./logica";
import { clavePista } from "./pistas";

export interface CrucigramaGameProps {
  codigo: string;
  estado: EstadoPartida;
  partida?: Partida | null;
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