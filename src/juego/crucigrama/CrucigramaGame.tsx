import type { EstadoPartida, Partida } from "../../types";
import { useCrucigramaJuego } from "./useCrucigramaJuego";
import { TableroCrucigrama } from "./TableroCrucigrama";
import { PanelPistas } from "./PanelPistas";

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
  esInvitado?: boolean;
  onPalabraEncontrada?: (palabraId: string) => void;
  onProgreso?: (encontradas: number, total: number) => void;
}

export function CrucigramaGame({
  codigo,
  estado,
  partida,
  esInvitado = false,
  onPalabraEncontrada,
  onProgreso,
}: CrucigramaGameProps) {
  const juego = useCrucigramaJuego({ codigo, estado, esInvitado, onPalabraEncontrada, onProgreso });

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
        idPorNumero={juego.idPorNumero}
        encontradasIds={juego.encontradasIds}
        partida={partida}
        onActivarPalabra={juego.activarPalabra}
      />
    </div>
  );
}