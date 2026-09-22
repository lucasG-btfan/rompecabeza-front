
export type Orientacion = "E" | "O" | "N" | "S" | "SE" | "SO" | "NE" | "NO";
export type OrientacionCrucigrama = "H" | "V";

export interface PosicionCrucigrama {
  fila: number;
  columna: number;
  orientacion: OrientacionCrucigrama;
}

export interface PosicionCrucigramaInput {
  fila: number;
  columna: number;
  orientacion: OrientacionCrucigrama;
}

export type EditorPalabra = Omit<Palabra, "posicion" | "palabra"> & {
  posicion?: PosicionCrucigrama | null;
  palabra: string;
};

export interface EditorPartida {
  codigo: string;
  tipo: TipoPartida;
  estado: string;
  palabras: EditorPalabra[];
  nombre?: string | null;
}

export type TipoPartida = "sopa" | "crucigrama";

export type FasePartida = "creando" | "activo" | "finalizado";

export interface PalabraInput {
  palabra: string;
  explicacion?: string | null;
}

export interface Palabra {
  id: string;
  palabra: string | null;
  texto_mostrar: string | null;
  explicacion?: string | null;
  posicion?: Posicion | null;
  encontrada: boolean;
}

export interface Posicion {
  fila: number;
  columna: number;
  orientacion: Orientacion | OrientacionCrucigrama;
  numero?: number | null;
}

export interface PosicionGrilla {
  fila: number;
  columna: number;
}

export interface CeldaGrilla {
  letra: string | null;
  numero: number | null;
  tipo: "letra" | "negra";
}

export interface PalabraGrilla {
  numero: number;
  orientacion: OrientacionCrucigrama;
  posicion: PosicionGrilla;
  longitud: number;
  texto: string | null;
}

export interface GrillaCrucigrama {
  celdas: CeldaGrilla[];
  palabras: PalabraGrilla[];
}

export interface CrearPartidaInput {
  tipo: TipoPartida;
  palabras: PalabraInput[];
  config?: Record<string, unknown> | null;
  nombre?: string | null;
}

export interface CrearPartidaOutput {
  id: string;
  codigo: string;
  tipo: TipoPartida;
  estado: string;
  nombre?: string | null;
}

export interface Partida {
  id: string;
  codigo: string;
  tipo: TipoPartida;
  estado: string;
  palabras: Palabra[];
  config: Record<string, unknown> | null;
  creado_en: string;
  es_creador: boolean;
  nombre?: string | null;
}

export interface ResumenPartida {
  id: string;
  codigo: string;
  tipo: TipoPartida;
  estado: FasePartida;
  creado_en: string;
  palabras_total: number;
  palabras_encontradas: number;
  nombre?: string | null;
  en_duelo: boolean;
  en_espera: boolean;
}

export interface EstadoPalabra {
  id: string;
  palabra: string | null;
  texto_mostrar?: string | null;
  numero?: number | null;
  encontrada: boolean;
  posicion?: Posicion | null;
}

export interface EstadoPartida {
  codigo: string;
  tipo: TipoPartida;
  estado: string;
  grilla: string[][] | GrillaCrucigrama | null;
  palabras: EstadoPalabra[];
}

export interface EdicionInput {
  fila: number;
  columna: number;
  letra: string;
}

export interface FinalizarPartidaOutput {
  codigo: string;
  estado: string;
  filas: number;
  columnas: number;
}

export interface MarcarEncontradaInput {
  fila_inicio: number;
  columna_inicio: number;
  fila_fin: number;
  columna_fin: number;
}

export interface MarcarEncontradaOutput {
  encontrada: boolean;
  posicion?: Posicion | null;
  duelo_finalizado?: ResultadoDuelo | null;
}

export interface UnirseOutput {
  modo: "registrado" | "invitado";
  emparejado: boolean;
}


export interface ResultadoDuelo {
  yo_palabras: number;
  rival_palabras: number;
  gane: boolean | null;
  motivo: "corte" | "abandono" | "empate";
  rival: string | null;
  tiempo_total_seg: number;
  finalizado_en?: string | null;
}
