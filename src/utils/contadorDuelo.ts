/**
 * Contador visible del duelo 1v1 (AMEND feedback PO 2026-09-19, CAMBIO 2).
 *
 * Lógica PURA: `textoMarcadorDuelo` arma el marcador "[jugador1] n/m
 * [jugador2] n/m" y el componente `MarcadorDuelo` solo lo pinta (patrón
 * resultadoDuelo.ts).
 *
 * - el `yo` del marcador usa el contador LOCAL de la sesión (la palabra se
 *   resuelve y pinta al instante); el `rival` usa el contador del backend por
 *   poll (D10: hasta 3 s de desfase, es el mismo reloj del cierre del duelo).
 * - `contadorAcotado` defiende el "n/m": durante la carrera del corte el
 *   backend puede reportar un valor momentáneo que ya pasó `m` — en pantalla
 *   nunca se muestra más que "m/m".
 * - `nombre: null` (rival todavía no emparejado) → placeholder "rival".
 */

export interface DatoJugador {
  /** Username del jugador (null = el rival todavía no se conoce). */
  nombre: string | null;
  contador: number;
}

/** Acota un contador al rango [0, total] antes de pintarlo (anti-glitch). */
export function contadorAcotado(contador: number, total: number): number {
  return Math.max(0, Math.min(contador, total));
}

/** "[jugador1] n/m [jugador2] n/m" con ambas etiquetas. El rival desconocido
 *  se muestra como "[rival] n/m". */
export function textoMarcadorDuelo(
  jugador1: DatoJugador,
  jugador2: DatoJugador,
  total: number,
): string {
  const etiqueta = (jugador: DatoJugador) =>
    `[${jugador.nombre ?? "rival"}] ${contadorAcotado(jugador.contador, total)}/${total}`;
  return `${etiqueta(jugador1)} ${etiqueta(jugador2)}`;
}