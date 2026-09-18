import { api } from "./client";
import type { EmparejamientoEstadoOutput } from "../types";

/** API de emparejamientos 1v1 (C-17) — match-or-wait, poll y cancelación. */
export const emparejamientosApi = {
  /** POST /emparejamientos: crea la espera (esperando) o matchea a un rival
   *  que ya espera (emparejado). Errores: 403 creador, 404, 400 no activa,
   *  409 carrera/duelo en curso. */
  crear: (codigoPartida: string) =>
    api.post<EmparejamientoEstadoOutput>("/emparejamientos", {
      codigo_partida: codigoPartida,
    }),

  /** GET /emparejamientos/estado: poll 3s del flujo. `cancelado`/`expirado`
   *  se reportan UNA vez (el siguiente poll devuelve `estado: null`). */
  estado: () => api.get<EmparejamientoEstadoOutput>("/emparejamientos/estado"),

  /** DELETE /emparejamientos: cancela la propia espera (204). Si el duelo ya
   *  arrancó responde 400 ("El duelo ya comenzó"). */
  cancelar: () => api.delete<void>("/emparejamientos"),
};