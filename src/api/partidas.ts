import { api } from "./client";
import type {
  CrearPartidaInput,
  CrearPartidaOutput,
  EdicionInput,
  EstadoPartida,
  FinalizarPartidaOutput,
  MarcarEncontradaInput,
  MarcarEncontradaOutput,
  Palabra,
  PalabraInput,
  Partida,
  PosicionInput,
  RankingEntry,
  ResumenPartida,
  UnirseOutput,
} from "../types";

export const partidasApi = {
  /** Lista las partidas que creó el usuario logueado. */
  listarMias: () => api.get<ResumenPartida[]>("/partidas"),

  /** Crea una partida nueva (requiere estar logueado). */
  crearPartida: (input: CrearPartidaInput) =>
    api.post<CrearPartidaOutput>("/partidas", input),

  /** Vista pública de una partida por código (sin posiciones no encontradas). */
  obtenerPartida: (codigo: string) => api.get<Partida>(`/partidas/${codigo}`),

  /** Agrega palabras a una partida en estado 'creando' (solo creador). */
  agregarPalabras: (codigo: string, palabras: PalabraInput[]) =>
    api.post<Palabra[]>(`/partidas/${codigo}/palabras`, { palabras }),

  /** Edita el texto de una palabra (solo creador, solo estado 'creando'). */
  editarPalabra: (codigo: string, palabraId: string, palabra: PalabraInput) =>
    api.put<Palabra>(`/partidas/${codigo}/palabras/${palabraId}`, palabra),

  /** Elimina una palabra (solo creador, solo estado 'creando'). */
  eliminarPalabra: (codigo: string, palabraId: string) =>
    api.delete<void>(`/partidas/${codigo}/palabras/${palabraId}`),

  /** Posiciona manualmente una palabra en la grilla (solo creador). */
  posicionarPalabra: (codigo: string, palabraId: string, posicion: PosicionInput) =>
    api.put<Palabra>(`/partidas/${codigo}/palabras/${palabraId}/posicion`, posicion),

  /** Genera la sopa y pasa la partida a 'activo' (solo creador, solo tipo sopa). */
  finalizarPartida: (codigo: string) =>
    api.post<FinalizarPartidaOutput>(`/partidas/${codigo}/finalizar`),

  /** Edita una letra de la grilla ya generada (solo creador, si no hay encuentros). */
  editarLetra: (codigo: string, edicion: EdicionInput) =>
    api.put<EstadoPartida>(`/partidas/${codigo}/ediciones`, edicion),

  /** Estado actual para jugar (grilla + palabras, sin posiciones no encontradas). */
  obtenerEstado: (codigo: string) => api.get<EstadoPartida>(`/partidas/${codigo}/estado`),

  /** Llama al entrar a jugar: arranca el cronómetro (funciona para invitados). */
  unirsePartida: (codigo: string) =>
    api.post<UnirseOutput>(`/partidas/${codigo}/unirse`),

  /** Marca una palabra como encontrada validando la selección (invitados también). */
  marcarEncontrada: (codigo: string, palabraId: string, seleccion: MarcarEncontradaInput) =>
    api.put<MarcarEncontradaOutput>(
      `/partidas/${codigo}/palabras/${palabraId}/encontrada`,
      seleccion,
    ),

  /** Tabla de puntajes de la partida. */
  obtenerRanking: (codigo: string) => api.get<RankingEntry[]>(`/partidas/${codigo}/ranking`),

  /** Elimina la partida permanentemente (solo creador). */
  eliminarPartida: (codigo: string) => api.delete<void>(`/partidas/${codigo}`),
};
