import type {
  GrillaCrucigrama,
  OrientacionCrucigrama,
  PalabraGrilla,
} from "../../types";
import { clavePista, type ClavePista } from "./pistas";

export interface CeldaTablero {
  fila: number;
  columna: number;
  letra: string | null;
  numero: number | null;
  tipo: "letra" | "negra";
  indice: number;
}

const DELTAS: Record<OrientacionCrucigrama, { dr: number; dc: number }> = {
  H: { dr: 0, dc: 1 },
  V: { dr: 1, dc: 0 },
};

function claveCelda(fila: number, columna: number): string {
  return `${fila},${columna}`;
}

function dimensiones(grilla: GrillaCrucigrama): { filas: number; columnas: number } {
  const filas = Math.max(
    0,
    ...grilla.palabras.map(
      (w) => w.posicion.fila + (w.orientacion === "V" ? w.longitud : 1),
    ),
  );
  const columnas = Math.max(
    0,
    ...grilla.palabras.map(
      (w) => w.posicion.columna + (w.orientacion === "H" ? w.longitud : 1),
    ),
  );
  return { filas, columnas };
}

export function armarTablero(grilla: GrillaCrucigrama): CeldaTablero[][] {
  const { filas, columnas } = dimensiones(grilla);
  const tablero: CeldaTablero[][] = Array.from({ length: filas }, (_, fila) =>
    Array.from({ length: columnas }, (_, columna) => ({
      fila,
      columna,
      letra: null,
      numero: null,
      tipo: "negra" as const,
      indice: -1,
    })),
  );

  grilla.celdas.forEach((celda, indice) => {
    const fila = Math.floor(indice / columnas);
    const columna = indice % columnas;
    if (fila < 0 || fila >= filas || columna < 0 || columna >= columnas) return;
    tablero[fila][columna] = { ...celda, fila, columna, indice };
  });

  return tablero;
}

/** Palabras (de la grilla) que cubren una celda, según orientación. */
function palabrasQueCubren(
  grilla: GrillaCrucigrama,
  fila: number,
  columna: number,
): { h: PalabraGrilla[]; v: PalabraGrilla[] } {
  const h: PalabraGrilla[] = [];
  const v: PalabraGrilla[] = [];
  for (const w of grilla.palabras) {
    if (w.orientacion === "H") {
      if (
        fila === w.posicion.fila &&
        columna >= w.posicion.columna &&
        columna < w.posicion.columna + w.longitud
      ) {
        h.push(w);
      }
    } else if (
      columna === w.posicion.columna &&
      fila >= w.posicion.fila &&
      fila < w.posicion.fila + w.longitud
    ) {
      v.push(w);
    }
  }
  return { h, v };
}

export function palabraEnCelda(
  grilla: GrillaCrucigrama,
  fila: number,
  columna: number,
  preferencia: OrientacionCrucigrama,
): PalabraGrilla | null {
  const { h, v } = palabrasQueCubren(grilla, fila, columna);
  if (preferencia === "H") {
    return h[0] ?? v[0] ?? null;
  }
  return v[0] ?? h[0] ?? null;
}

export function celdasDePalabraGrilla(
  palabra: PalabraGrilla,
): { fila: number; columna: number }[] {
  const { dr, dc } = DELTAS[palabra.orientacion];
  return Array.from({ length: palabra.longitud }, (_, i) => ({
    fila: palabra.posicion.fila + i * dr,
    columna: palabra.posicion.columna + i * dc,
  }));
}

export type FlechaTeclado = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

const PERPENDICULAR: Record<
  OrientacionCrucigrama,
  Record<FlechaTeclado, { dr: number; dc: number } | null>
> = {
  H: {
    ArrowUp: { dr: -1, dc: 0 },
    ArrowDown: { dr: 1, dc: 0 },
    ArrowLeft: null,
    ArrowRight: null,
  },
  V: {
    ArrowLeft: { dr: 0, dc: -1 },
    ArrowRight: { dr: 0, dc: 1 },
    ArrowUp: null,
    ArrowDown: null,
  },
};

export function celdaAdyacente(
  fila: number,
  columna: number,
  orientacionActiva: OrientacionCrucigrama,
  key: FlechaTeclado,
  tablero: CeldaTablero[][],
): { fila: number; columna: number } | null {
  const delta = PERPENDICULAR[orientacionActiva][key];
  if (!delta) return null;
  const destino = { fila: fila + delta.dr, columna: columna + delta.dc };
  const filaDestino = tablero[destino.fila];
  if (!filaDestino) return null;
  const celda = filaDestino[destino.columna];
  if (!celda || celda.tipo === "negra") return null;
  return destino;
}

export function respuestaDePalabra(
  palabra: PalabraGrilla,
  letras: Map<string, string>,
): string | null {
  const respuesta: string[] = [];
  for (const { fila, columna } of celdasDePalabraGrilla(palabra)) {
    const letra = letras.get(claveCelda(fila, columna));
    if (!letra) return null;
    respuesta.push(letra);
  }
  return respuesta.join("");
}

export function siguienteCeldaVacia(
  celdas: { fila: number; columna: number }[],
  letras: Map<string, string>,
  desde: number,
): { fila: number; columna: number } | null {
  const total = celdas.length;
  for (let paso = 1; paso <= total; paso++) {
    const celda = celdas[(desde + paso) % total];
    if (!letras.has(claveCelda(celda.fila, celda.columna))) {
      return celda;
    }
  }
  return null;
}

export function celdasDeEncontradas(
  palabrasGrilla: PalabraGrilla[],
  clavesEncontradas: Set<ClavePista>,
): Set<string> {
  const celdas = new Set<string>();
  for (const w of palabrasGrilla) {
    if (!clavesEncontradas.has(clavePista(w.numero, w.orientacion))) continue;
    for (const { fila, columna } of celdasDePalabraGrilla(w)) {
      celdas.add(claveCelda(fila, columna));
    }
  }
  return celdas;
}

export type EstadoCeldaLabel = "letra" | "encontrada" | "error";

export function describirCelda(
  celda: Pick<CeldaTablero, "letra" | "numero" | "tipo">,
  fila: number,
  columna: number,
  estado: EstadoCeldaLabel = "letra",
): string {
  if (celda.tipo === "negra") return "Celda negra";
  const posicion = `fila ${fila}, columna ${columna}`;
  const sufijo = estado === "letra" ? "" : `, ${estado}`;
  if (celda.letra == null) {
    const numero = celda.numero != null ? `número ${celda.numero}, ` : "";
    return `Celda vacía, ${numero}${posicion}`;
  }
  const numero = celda.numero != null ? `Número ${celda.numero}, ` : "";
  return `${numero}${posicion}, letra ${celda.letra}${sufijo}`;
}

export interface ResultadoBorrado {
  indiceBorrado: number | null;
  nuevoFoco: number;
}

export function indiceTrasBorrado(
  indice: number,
  tieneLetra: boolean,
  totalCeldas: number,
): ResultadoBorrado {
  if (indice < 0 || indice >= totalCeldas) {
    return { indiceBorrado: null, nuevoFoco: indice };
  }
  if (tieneLetra) {
    return { indiceBorrado: indice, nuevoFoco: indice };
  }
  if (indice === 0) {
    return { indiceBorrado: null, nuevoFoco: 0 };
  }
  return { indiceBorrado: indice - 1, nuevoFoco: indice - 1 };
}

export function borrarLetra(
  letras: ReadonlyMap<string, string>,
  celda: { fila: number; columna: number },
): Map<string, string> {
  const m = new Map(letras);
  m.delete(claveCelda(celda.fila, celda.columna));
  return m;
}