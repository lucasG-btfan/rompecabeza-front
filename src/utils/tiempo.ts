/**
 * Utilidades de tiempo para la UI (C-12, D2; C-13).
 *
 * `formatearTiempo` se extrajo del formateador local de la vieja pantalla de
 * ranking para compartirse con el cronómetro (`Cronometro.tsx`) y la pantalla
 * de completado de partida. El formato pasa de "1m 05s" a `mm:ss` (reloj de
 * carrera): al ser null-safe y puro, se puede testear de forma directa con vitest.
 */

/**
 * Formatea segundos como reloj `mm:ss` con pad de dos dígitos.
 * `null`/`undefined` devuelven "—" (sin tiempo registrado).
 */
export function formatearTiempo(segundos: number | null | undefined): string {
  if (segundos == null) return "—";
  const total = Math.floor(segundos);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Segundos enteros transcurridos entre dos epochs en ms (para el cronómetro
 * del juego, C-12/D2). Piso a los segundos completos y clampa a 0 si `desde`
 * es futuro (reloj del cliente adelantado): el reloj nunca muestra negativos.
 */
export function segundosTranscurridos(desde: number, ahora: number): number {
  return Math.max(0, Math.floor((ahora - desde) / 1000));
}