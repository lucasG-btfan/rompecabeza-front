/**
 * Lógica pura de progreso de partida compartida entre sopa y crucigrama
 * (C-14, D10).
 *
 * Con el progreso efímero (C-14) NO existe persistencia por jugador: ni el
 * backend guarda participaciones/hallazgos, ni el front usa localStorage.
 * La única fuente de verdad de "palabras encontradas" es la sesión en memoria
 * (el `estado.palabras` que devuelve el GET /estado). Acá viven las
 * transformaciones puras de ese estado, sin side effects — testeables con
 * vitest.
 */

/** IDs de palabras encontradas en la sesión: las que vienen con
 * `encontrada: true` en el estado de la partida. */
export function idsEncontrados(
  palabras: { id: string; encontrada: boolean }[],
): Set<string> {
  const ids = new Set<string>();
  for (const p of palabras) {
    if (p.encontrada) ids.add(p.id);
  }
  return ids;
}