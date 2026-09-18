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
  /** Lista las partidas que creó el usuario logueado. */
  listarMias: () => api.get<ResumenPartida[]>("/partidas"),

  /** Crea una partida nueva (requiere estar logueado). */
  crearPartida: (input: CrearPartidaInput) =>
    api.post<CrearPartidaOutput>("/partidas", input),

  /** Vista pública de una partida por código (sin posiciones no encontradas). */
  obtenerPartida: (codigo: string) => api.get<Partida>(`/partidas/${codigo}`),

  /** Layout editable del crucigrama, SOLO creador (C-09): posiciones siempre visibles. */
  obtenerEditorPartida: (codigo: string) => api.get<EditorPartida>(`/partidas/${codigo}/editor`),

  /** Agrega palabras a una partida en estado 'creando' (solo creador). */
  agregarPalabras: (codigo: string, palabras: PalabraInput[]) =>
    api.post<Palabra[]>(`/partidas/${codigo}/palabras`, { palabras }),

  /** Edita el texto de una palabra (solo creador, solo estado 'creando'). */
  editarPalabra: (codigo: string, palabraId: string, palabra: PalabraInput) =>
    api.put<Palabra>(`/partidas/${codigo}/palabras/${palabraId}`, palabra),

  /** Elimina una palabra (solo creador, solo estado 'creando'). */
  eliminarPalabra: (codigo: string, palabraId: string) =>
    api.delete<void>(`/partidas/${codigo}/palabras/${palabraId}`),

  /** Posiciona manualmente una palabra del crucigrama en el editor (C-09, solo creador,
   *  orientación H/V). El backend es la autoridad: re-valida conectividad/cruce/fantasma. */
  posicionarPalabra: (
    codigo: string,
    palabraId: string,
    posicion: PosicionCrucigramaInput,
  ) => api.put<EditorPalabra>(`/partidas/${codigo}/palabras/${palabraId}/posicion`, posicion),

  /** Quita la posición manual de una palabra del crucigrama en el editor (C-11, solo
   *  creador, estado 'creando'): vuelve a `posicion: null` para reposicionarla o dejar
   *  que finalizar la genere automáticamente. */
  quitarPosicionPalabra: (codigo: string, palabraId: string) =>
    api.delete<EditorPalabra>(`/partidas/${codigo}/palabras/${palabraId}/posicion`),

  /** Genera la sopa y pasa la partida a 'activo' (solo creador, solo tipo sopa). */
  finalizarPartida: (codigo: string) =>
    api.post<FinalizarPartidaOutput>(`/partidas/${codigo}/finalizar`),

  /** Edita una letra de la grilla ya generada (solo creador, si no hay encuentros). */
  editarLetra: (codigo: string, edicion: EdicionInput) =>
    api.put<EstadoPartida>(`/partidas/${codigo}/ediciones`, edicion),

  /** Estado actual para jugar (grilla + palabras, sin posiciones no encontradas). */
  obtenerEstado: (codigo: string) => api.get<EstadoPartida>(`/partidas/${codigo}/estado`),

  /** Llama al entrar a jugar: valida que la partida esté activa (C-14: no
   *  crea participación ni arranca cronómetro en el backend — el reloj y el
   *  progreso viven 100% en la sesión del cliente). */
  unirsePartida: (codigo: string) =>
    api.post<UnirseOutput>(`/partidas/${codigo}/unirse`),

  /** Marca una palabra como encontrada validando la selección. C-14: el
   * backend valida y responde la posición, pero NO persiste el hallazgo
   * (el progreso es efímero, de la sesión). */
  marcarEncontrada: (codigo: string, palabraId: string, seleccion: MarcarEncontradaInput) =>
    api.put<MarcarEncontradaOutput>(
      `/partidas/${codigo}/palabras/${palabraId}/encontrada`,
      seleccion,
    ),

  /** Valida las letras tipeadas de una palabra del CRUCIGRAMA (C-10, D1). El backend
   * es la autoridad: normaliza con limpiar_para_grilla y compara contra la solución.
   * 400 = letras incorrectas (el front limpia solo esa palabra); 200 = acierto. */
  responderPalabra: (codigo: string, palabraId: string, letras: string) =>
    api.put<MarcarEncontradaOutput>(
      `/partidas/${codigo}/palabras/${palabraId}/respuesta`,
      { letras },
    ),

  /** Elimina la partida permanentemente (solo creador). */
  eliminarPartida: (codigo: string) => api.delete<void>(`/partidas/${codigo}`),

  /** Renombra la partida (C-15): asigna, modifica o limpia `nombre` (solo creador).
   *  - `nombre` string → se guarda (trimeado por el backend, máx 50).
   *  - `nombre: null` → limpia el nombre (vuelve a mostrarse el código).
   *  Devuelve el `ResumenPartidaResponse` completo. */
  renombrar: (codigo: string, nombre: string | null) =>
    api.patch<ResumenPartida>(`/partidas/${codigo}/nombre`, { nombre }),
};
