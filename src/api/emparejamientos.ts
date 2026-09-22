import { api } from "./client";
import type { EmparejamientoEstadoOutput, ResultadoDuelo } from "../types";

export const emparejamientosApi = {
  crear: (codigoPartida: string) =>
    api.post<EmparejamientoEstadoOutput>("/emparejamientos", {
      codigo_partida: codigoPartida,
    }),

  estado: () => api.get<EmparejamientoEstadoOutput>("/emparejamientos/estado"),

  cancelar: () => api.delete<void>("/emparejamientos"),

  abandonar: (codigoPartida: string) =>
    api.post<ResultadoDuelo>("/emparejamientos/abandonar", {
      codigo_partida: codigoPartida,
    }),
};