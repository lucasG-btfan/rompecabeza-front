/**
 * Contratos del lobby 1v1 (C-17) — espejo de app/schemas/lobby.py y
 * app/schemas/emparejamiento.py del backend.
 */

import type { TipoPartida } from "./partidas";

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
 *  tsconfig de Vite usa `erasableSyntaxOnly`). */
export type EmparejamientoEstado =
  | "esperando"
  | "emparejado"
  | "cancelado"
  | "expirado"
  | null;

/** Respuesta del POST /emparejamientos y del poll GET /emparejamientos/estado
 *  (EmparejamientoEstadoResponse). `partida`/`rival` solo presentes según el
 *  estado; `cancelado`/`expirado` se reportan UNA vez (luego → null). */
export interface EmparejamientoEstadoOutput {
  estado: EmparejamientoEstado;
  partida?: PartidaLobby | null;
  /** Username del OTRO jugador (solo si `emparejado`). */
  rival?: string | null;
  creado_en?: string | null;
  emparejado_en?: string | null;
}