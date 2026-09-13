/**
 * Contratos de partidas — espejo de app/schemas/partida.py y app/schemas/usuario.py (ranking)
 * del backend. Son el "contrato" con el endpoint de partidas.
 */

/** Orientaciones válidas para posicionar una palabra en la grilla. */
export type Orientacion = "E" | "O" | "N" | "S" | "SE" | "SO" | "NE" | "NO";

/** Orientaciones del crucigrama (C-09): solo ortogonales H/V. */
export type OrientacionCrucigrama = "H" | "V";

/** Posición de una palabra en el layout editable del crucigrama (C-09). */
export interface PosicionCrucigrama {
  fila: number;
  columna: number;
  orientacion: OrientacionCrucigrama;
}

/** Body para posicionar una palabra en el editor manual de crucigrama (C-09). */
export interface PosicionCrucigramaInput {
  fila: number;
  columna: number;
  orientacion: OrientacionCrucigrama;
}

/** Palabra del editor manual (C-09): posiciones SIEMPRE visibles con orientación H/V. */
export type EditorPalabra = Omit<Palabra, "posicion"> & {
  posicion?: PosicionCrucigrama | null;
};

/** Respuesta del GET /partidas/{codigo}/editor — layout editable, solo creador (C-09).
 *  A diferencia de `Partida`, aquí la `posicion` de cada palabra es SIEMPRE visible
 *  (null si todavía no está posicionada). */
export interface EditorPartida {
  codigo: string;
  tipo: TipoPartida;
  estado: string;
  palabras: EditorPalabra[];
}

/** Tipo de juego. Por ahora el backend solamente genera la grilla para 'sopa'. */
export type TipoPartida = "sopa" | "crucigrama";

/** Estado de una partida en su ciclo de vida. */
export type FasePartida = "creando" | "activo" | "finalizado";

/** Palabra tal como se manda al crear/agregar. */
export interface PalabraInput {
  palabra: string;
  explicacion?: string | null;
}

/** Una palabra tal como la devuelve el backend (schemas PalabraResponse/PalabraPublicaResponse). */
export interface Palabra {
  id: string;
  palabra: string;
  /** Versión presentable con separadores ("CO-AUTOR"); `palabra` es la versión de grilla ("COAUTOR"). */
  texto_mostrar?: string | null;
  explicacion?: string | null;
  /** Solo se revela si `encontrada` es true; si no, es null (anti-cheat del backend). */
  posicion?: Posicion | null;
  encontrada: boolean;
}

/** Posición de una palabra en la grilla (sopa: 8 direcciones; crucigrama: H/V). */
export interface Posicion {
  fila: number;
  columna: number;
  orientacion: Orientacion | OrientacionCrucigrama;
  /** Numero de pista del crucigrama (C-10, D3): presente en posiciones reveladas. */
  numero?: number | null;
}

/** Posición de inicio de una palabra en la grilla final del crucigrama
 * (PalabraGrilla.posicion del contrato D6: solo fila/columna; la orientación
 * es campo aparte de la palabra). */
export interface PosicionGrilla {
  fila: number;
  columna: number;
}

/** Celda de la grilla del crucigrama (GrillaCeldaCrucigrama, D6/C-10). En el
 * GET /estado la `letra` va null mientras ninguna palabra encontrada la cubra
 * (anti-cheat); `numero` de pista y `tipo` siempre visibles. */
export interface CeldaGrilla {
  letra: string | null;
  numero: number | null;
  tipo: "letra" | "negra";
}

/** Palabra de la grilla del crucigrama (PalabraGrillaCrucigrama, D6/C-10). */
export interface PalabraGrilla {
  numero: number;
  orientacion: OrientacionCrucigrama;
  posicion: PosicionGrilla;
  longitud: number;
  /** Solución: null en GET /estado (anti-cheat); presente en POST /finalizar. */
  texto: string | null;
}

/** Grilla completa del crucigrama (GrillaCrucigrama, D6). */
export interface GrillaCrucigrama {
  celdas: CeldaGrilla[];
  palabras: PalabraGrilla[];
}

/** Body para crear una partida (CrearPartidaRequest del backend). */
export interface CrearPartidaInput {
  tipo: TipoPartida;
  palabras: PalabraInput[];
  config?: Record<string, unknown> | null;
}

/** Respuesta de crear partida (CrearPartidaResponse). */
export interface CrearPartidaOutput {
  id: string;
  codigo: string;
  tipo: TipoPartida;
  estado: string;
}

/** Vista pública de una partida (PartidaPublicaResponse) — sin posiciones no encontradas. */
export interface Partida {
  id: string;
  codigo: string;
  tipo: TipoPartida;
  estado: string;
  palabras: Palabra[];
  config: Record<string, unknown> | null;
  creado_en: string;
}

/** Resumen para la lista "Mis partidas" (ResumenPartidaResponse — agregado en el backend). */
export interface ResumenPartida {
  id: string;
  codigo: string;
  tipo: TipoPartida;
  estado: FasePartida;
  creado_en: string;
  palabras_total: number;
  palabras_encontradas: number;
}

/** Palabra con su estado en el juego (EstadoPalabraResponse). */
export interface EstadoPalabra {
  id: string;
  /** C-10: en crucigrama va null (anti-cheat); en sopa expone la palabra buscada. */
  palabra: string | null;
  texto_mostrar?: string | null;
  /** Numero de pista del crucigrama (D3): visible siempre, aunque no esté encontrada. */
  numero?: number | null;
  encontrada: boolean;
  posicion?: Posicion | null;
}

/** Estado de una partida para jugar (EstadoPartidaResponse) — trae la grilla resuelta. */
export interface EstadoPartida {
  codigo: string;
  tipo: TipoPartida;
  estado: string;
  grilla: string[][] | GrillaCrucigrama | null;
  palabras: EstadoPalabra[];
}

/** Body para posicionar manualmente una palabra (PosicionUpdate). */
export interface PosicionInput {
  fila: number;
  columna: number;
  orientacion: Orientacion;
}

/** Body para editar una letra de la grilla (EdicionRequest). */
export interface EdicionInput {
  fila: number;
  columna: number;
  letra: string;
}

/** Respuesta de finalizar partida (FinalizarResponse). */
export interface FinalizarPartidaOutput {
  codigo: string;
  estado: string;
  filas: number;
  columnas: number;
}

/** Body para marcar una palabra como encontrada (EncontradaRequest). */
export interface MarcarEncontradaInput {
  fila_inicio: number;
  columna_inicio: number;
  fila_fin: number;
  columna_fin: number;
}

/** Respuesta de marcar encontrada (EncontradaResponse). */
export interface MarcarEncontradaOutput {
  encontrada: boolean;
  posicion?: Posicion | null;
}

/** Respuesta de unirse a una partida (UnirseResponse). */
export interface UnirseOutput {
  modo: "registrado" | "invitado";
  iniciado_en?: string | null;
}

/** Una entrada del ranking (RankingEntry). */
export interface RankingEntry {
  username: string;
  rol: string;
  palabras_encontradas: number;
  tiempo_segundos?: number | null;
  puntaje: number;
}
