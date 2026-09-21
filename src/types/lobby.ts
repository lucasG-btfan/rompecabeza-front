/**
 * Contratos del lobby 1v1 (C-17) — espejo de app/schemas/lobby.py y
 * app/schemas/emparejamiento.py del backend.
 */

import type { ResultadoDuelo, TipoPartida } from "./partidas";

/** Ítem del listado público anti-cheat (PartidaLobbyResponse): solo metadatos,
 *  NUNCA palabras, posiciones, grilla ni explicaciones. */
export interface PartidaLobby {
  codigo: string;
  tipo: TipoPartida;
  cantidad_palabras: number;
  /** C-15: nombre opcional asignado por el creador (null = sin nombre). */
  nombre?: string | null;
  /** C-17: true si la partida tiene un duelo 1v1 FORMADO (`emparejado`).
   *  C-23 (D1): una espera de rival ya NO marca `en_duelo`. */
  en_duelo: boolean;
  /** C-23 (D4): true si hay una espera de rival pendiente (`esperando`).
   *  Aditivo — default false = partida libre. */
  en_espera: boolean;
}

/** Estados posibles de un emparejamiento 1v1 (union type — no enum: el
 *  tsconfig de Vite usa `erasableSyntaxOnly`). C-19: `finalizado` es ESTABLE
 *  (D6): trae `resultado` y nunca se consume como cancelado/expirado. */
export type EmparejamientoEstado =
  | "esperando"
  | "emparejado"
  | "cancelado"
  | "expirado"
  | "finalizado"
  | null;

/** Respuesta del POST /emparejamientos y del poll GET /emparejamientos/estado
 *  (EmparejamientoEstadoResponse). `partida`/`rival` solo presentes según el
 *  estado; `cancelado`/`expirado` se reportan UNA vez (luego → null).
 *  AMEND CAMBIO 2: `yo_palabras`/`rival_palabras` (solo si `emparejado`)
 *  son los contadores n/m normalizados por requester para el marcador. */
export interface EmparejamientoEstadoOutput {
  estado: EmparejamientoEstado;
  partida?: PartidaLobby | null;
  /** Username del OTRO jugador (solo si `emparejado`). */
  rival?: string | null;
  creado_en?: string | null;
  emparejado_en?: string | null;
  /** Contador propio del duelo (solo si `emparejado`). */
  yo_palabras?: number | null;
  /** Contador del rival del duelo (solo si `emparejado`). */
  rival_palabras?: number | null;
  /** C-19: resultado del duelo (solo si `estado === "finalizado"`, D5). */
  resultado?: ResultadoDuelo | null;
}