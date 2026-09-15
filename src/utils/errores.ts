/**
 * Traducción de errores a copys entendibles (C-12, D2).
 *
 * `ApiError` (api/client.ts) ya extrae el `detail` del backend a `message` y
 * conserva el HTTP `status`. Esta función centraliza los copys por status:
 * 404 y 500 reciben mensajes humanizados ("¿el código estará bien?" / "se
 * rompió el servidor, no tu código"); el resto pasa el detail tal cual — el
 * backend ya escribe bien sus errores (partida en 'creando', no sos el
 * creador, 422 con la razón exacta).
 */

export interface ErrorConStatus {
  status?: number;
  message?: string;
}

/** Mensaje genérico cuando no hay error o desconocido (protección del caller). */
const GENERICO = "Algo salió mal. Probá de nuevo.";

/**
 * Devuelve el mensaje de error para mostrar al usuario.
 * - 404 → "La partida no existe o el código es incorrecto"
 * - 500 → "Hubo un problema en el servidor, probá de nuevo"
 * - otros status → el detail/message original del backend
 * - sin status (error de red local) → el mensaje original
 * - `null`/`undefined` (error no-Error, defensive) → fallback genérico
 */
export function mensajeError(e: ErrorConStatus | null | undefined): string {
  if (e == null) return GENERICO;
  if (e.status === 404) return "La partida no existe o el código es incorrecto";
  if (e.status === 500) return "Hubo un problema en el servidor, probá de nuevo";
  return e.message || GENERICO;
}