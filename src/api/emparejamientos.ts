import { api } from "./client";
import type { EmparejamientoEstadoOutput, ResultadoDuelo } from "../types";

/** API de emparejamientos 1v1 (C-17/C-19) — match-or-wait, poll, cancelación
 *  y abandono (forfeit). */
export const emparejamientosApi = {
  /** POST /emparejamientos: crea la espera (esperando) o matchea a un rival
   *  que ya espera (emparejado). Errores: 403 creador, 404, 400 no activa,
   *  409 carrera/duelo en curso. */
  crear: (codigoPartida: string) =>
    api.post<EmparejamientoEstadoOutput>("/emparejamientos", {
      codigo_partida: codigoPartida,
    }),

  /** GET /emparejamientos/estado: poll 3s del flujo. `cancelado`/`expirado`
   *  se reportan UNA vez (el siguiente poll devuelve `estado: null`); el
   *  duelo `finalizado` es ESTABLE y trae `resultado` (C-19, D6). */
  estado: () => api.get<EmparejamientoEstadoOutput>("/emparejamientos/estado"),

  /** DELETE /emparejamientos: cancela la propia espera (204). Si el duelo ya
   *  arrancó responde 400 ("El duelo ya comenzó"). */
  cancelar: () => api.delete<void>("/emparejamientos"),

  /** POST /emparejamientos/abandonar: forfeit del duelo 1v1 (C-19, D4).
   *  200 con `ResultadoDuelo` normalizado para quien abandona (gane: false).
   *  400 si no hay duelo en curso; 404 si la partida no existe. */
  abandonar: (codigoPartida: string) =>
    api.post<ResultadoDuelo>("/emparejamientos/abandonar", {
      codigo_partida: codigoPartida,
    }),
};