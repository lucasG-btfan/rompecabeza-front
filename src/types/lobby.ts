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
  /** True si la partida tiene una espera o duelo 1v1 activo. */
  en_duelo: boolean;
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