import type { ResultadoDuelo, TipoPartida } from "./partidas";

export interface PartidaLobby {
  codigo: string;
  tipo: TipoPartida;
  cantidad_palabras: number;
  nombre?: string | null;
  en_duelo: boolean;
  en_espera: boolean;
}

export type EmparejamientoEstado =
  | "esperando"
  | "emparejado"
  | "cancelado"
  | "expirado"
  | "finalizado"
  | null;

export interface EmparejamientoEstadoOutput {
  estado: EmparejamientoEstado;
  partida?: PartidaLobby | null;
  rival?: string | null;
  creado_en?: string | null;
  emparejado_en?: string | null;
  yo_palabras?: number | null;
  rival_palabras?: number | null;
  resultado?: ResultadoDuelo | null;
}