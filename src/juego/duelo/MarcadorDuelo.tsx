/**
 * Marcador visible del duelo 1v1 (AMEND feedback PO 2026-09-19, CAMBIO 2):
 * "[jugador1] n/m [jugador2] n/m".
 *
 * Presentacional PURA: el texto lo arma `textoMarcadorDuelo` (util) y acá
 * solo se pinta. `propio` = contador local de la sesión (instantáneo);
 * `rival` = contador del backend por poll (hasta 3 s de desfase, D10).
 */

import { textoMarcadorDuelo } from "../../utils/contadorDuelo";

export interface MarcadorDueloProps {
  /** Username del jugador de esta sesión (useAuth). */
  nombrePropio: string;
  /** Username del rival (del poll del duelo); null si aún no se emparejó. */
  nombreRival: string | null;
  /** Contador propio en pantalla (palabras encontradas en esta sesión). */
  propio: number;
  /** Contador del rival reportado por el backend (poll ~3s, D10). */
  rival: number;
  /** Total de palabras de la partida ("m" del marcador). */
  total: number;
}

export function MarcadorDuelo(props: MarcadorDueloProps) {
  const texto = textoMarcadorDuelo(
    { nombre: props.nombrePropio, contador: props.propio },
    { nombre: props.nombreRival, contador: props.rival },
    props.total,
  );

  return (
    <span className="rounded-full bg-tile px-3 py-1 font-mono text-xs font-semibold tabular-nums text-ink">
      {texto}
    </span>
  );
}