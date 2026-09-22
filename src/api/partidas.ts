import { api } from "./client";
import type {
  CrearPartidaInput,
  CrearPartidaOutput,
  EdicionInput,
  EditorPalabra,
  EditorPartida,
  EstadoPartida,
  FinalizarPartidaOutput,
  MarcarEncontradaInput,
  MarcarEncontradaOutput,
  Palabra,
  PalabraInput,
  Partida,
  PosicionCrucigramaInput,
  ResumenPartida,
  UnirseOutput,
} from "../types";

export const partidasApi = {
  listarMias: () => api.get<ResumenPartida[]>("/partidas"),

  crearPartida: (input: CrearPartidaInput) =>
    api.post<CrearPartidaOutput>("/partidas", input),

  obtenerPartida: (codigo: string) => api.get<Partida>(`/partidas/${codigo}`),

  obtenerEditorPartida: (codigo: string) => api.get<EditorPartida>(`/partidas/${codigo}/editor`),

  agregarPalabras: (codigo: string, palabras: PalabraInput[]) =>
    api.post<Palabra[]>(`/partidas/${codigo}/palabras`, { palabras }),

  editarPalabra: (codigo: string, palabraId: string, palabra: PalabraInput) =>
    api.put<Palabra>(`/partidas/${codigo}/palabras/${palabraId}`, palabra),

  eliminarPalabra: (codigo: string, palabraId: string) =>
    api.delete<void>(`/partidas/${codigo}/palabras/${palabraId}`),

  posicionarPalabra: (
    codigo: string,
    palabraId: string,
    posicion: PosicionCrucigramaInput,
  ) => api.put<EditorPalabra>(`/partidas/${codigo}/palabras/${palabraId}/posicion`, posicion),

  quitarPosicionPalabra: (codigo: string, palabraId: string) =>
    api.delete<EditorPalabra>(`/partidas/${codigo}/palabras/${palabraId}/posicion`),

  finalizarPartida: (codigo: string) =>
    api.post<FinalizarPartidaOutput>(`/partidas/${codigo}/finalizar`),

  editarLetra: (codigo: string, edicion: EdicionInput) =>
    api.put<EstadoPartida>(`/partidas/${codigo}/ediciones`, edicion),

  obtenerEstado: (codigo: string) => api.get<EstadoPartida>(`/partidas/${codigo}/estado`),

  unirsePartida: (codigo: string) =>
    api.post<UnirseOutput>(`/partidas/${codigo}/unirse`),

  marcarEncontrada: (codigo: string, palabraId: string, seleccion: MarcarEncontradaInput) =>
    api.put<MarcarEncontradaOutput>(
      `/partidas/${codigo}/palabras/${palabraId}/encontrada`,
      seleccion,
    ),

  responderPalabra: (codigo: string, palabraId: string, letras: string) =>
    api.put<MarcarEncontradaOutput>(
      `/partidas/${codigo}/palabras/${palabraId}/respuesta`,
      { letras },
    ),

  eliminarPartida: (codigo: string) => api.delete<void>(`/partidas/${codigo}`),

  renombrar: (codigo: string, nombre: string | null) =>
    api.patch<ResumenPartida>(`/partidas/${codigo}/nombre`, { nombre }),
};
