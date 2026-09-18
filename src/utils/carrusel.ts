/**
 * Lógica pura del carrusel del lobby (C-17, D11): navegación circular de
 * tarjetas de partidas. Funciones puras y sin estado: el componente guarda
 * `indice` y delega el cálculo acá (TDD vitest).
 *
 * Invariante: `total <= 1` → siempre 0 (no hay nada que navegar).
 */

export function siguienteIndice(actual: number, total: number): number {
  if (total <= 1) return 0;
  return (actual + 1) % total;
}

export function anteriorIndice(actual: number, total: number): number {
  if (total <= 1) return 0;
  return (actual - 1 + total) % total;
}