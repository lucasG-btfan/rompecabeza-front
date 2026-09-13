/**
 * Lógica pura del crucigrama JUGABLE (C-10, D5).
 *
 * Opera sobre el contrato D6 (`GrillaCrucigrama` = {celdas planas, palabras})
 * que devuelve el GET /estado, SIN tocar red ni BD. Todo es determinista y
 * testeable con vitest, igual que `editor/logica.ts` (C-09).
 *
 * Responsabilidades que NO le tocan a este módulo (viven en el componente):
 * - persistir el progreso del invitado (localStorage),
 * - llamar `responderPalabra` al backend,
 * - renderizar / manejar eventos del DOM.
 */

import type {
  EstadoPalabra,
  GrillaCrucigrama,
  OrientacionCrucigrama,
  PalabraGrilla,
} from "../../types";

export interface CeldaTablero {
  fila: number;
  columna: number;
  letra: string | null;
  numero: number | null;
  tipo: "letra" | "negra";
  /** Índice plano de la celda dentro de `grilla.celdas` (fila-major). */
  indice: number;
}

const DELTAS: Record<OrientacionCrucigrama, { dr: number; dc: number }> = {
  H: { dr: 0, dc: 1 },
  V: { dr: 1, dc: 0 },
};

function claveCelda(fila: number, columna: number): string {
  return `${fila},${columna}`;
}

/** Dimensión del tablero derivada del bounding box de las palabras
 * (misma matemática que el backend en `finalizar`). */
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

/** Construye la matriz fila x columna del tablero desde las celdas planas del
 * D6 (necesario para renderizar con Grilla/Tablero, que iteran por filas). */
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

/** Palabra activa al hacer click en una celda (D4). En un cruce H+V se
 * respeta la orientación preferida (toggle con un nuevo click en la misma
 * celda); fuera del cruce devuelve la única palabra que la cubre. */
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

/** Celdas (fila, columna) que ocupa una palabra de la grilla, en orden. */
export function celdasDePalabraGrilla(
  palabra: PalabraGrilla,
): { fila: number; columna: number }[] {
  const { dr, dc } = DELTAS[palabra.orientacion];
  return Array.from({ length: palabra.longitud }, (_, i) => ({
    fila: palabra.posicion.fila + i * dr,
    columna: palabra.posicion.columna + i * dc,
  }));
}

/** Letras tipeadas de la palabra concatenadas en orden (H o V). Si falta
 * alguna celda, null (palabra incompleta — no se valida contra el backend). */
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

/** Auto-advance: próxima celda vacía después de `desde` (con wrap). Si la
 * palabra está completa devuelve null. */
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

/** IDs de palabras encontradas por ESTE jugador: las del backend (registrado)
 * más las del localStorage (invitado). */
export function idsEncontrados(
  estadoPalabras: EstadoPalabra[],
  locales: { id: string }[],
): Set<string> {
  const ids = new Set<string>();
  for (const p of estadoPalabras) {
    if (p.encontrada) ids.add(p.id);
  }
  for (const h of locales) ids.add(h.id);
  return ids;
}

/** Celdas "fila,col" a pintar como encontradas, dadas las pistas (numeros)
 * encontradas. Las palabras de la grilla D6 se identifican por numero (el
 * backend no expone su id, pero `EstadoPalabra.numero` las vincula — D3). */
export function celdasDeEncontradas(
  palabrasGrilla: PalabraGrilla[],
  numerosEncontrados: Set<number>,
): Set<string> {
  const celdas = new Set<string>();
  for (const w of palabrasGrilla) {
    if (!numerosEncontrados.has(w.numero)) continue;
    for (const { fila, columna } of celdasDePalabraGrilla(w)) {
      celdas.add(claveCelda(fila, columna));
    }
  }
  return celdas;
}

export interface ResultadoBorrado {
  /** Índice de la celda cuya letra se elimina; null si no se borra nada. */
  indiceBorrado: number | null;
  /** Índice de la celda que queda enfocada tras el borrado. */
  nuevoFoco: number;
}

/**
 * Semántica de UN backspace (spec crucigrama-juego: "Backspace borra la letra
 * actual y retrocede" — C-11, defecto QA):
 * - celda CON letra -> se borra esa letra y el foco queda en la celda recién
 *   vaciada (lista para escribir la corrección);
 * - celda VACÍA no-inicio -> retrocede a la celda anterior Y borra la letra
 *   que haya allí en el MISMO press; el foco queda en la celda recién vaciada
 *   (así el borrado camina hasta el inicio de la palabra, una letra por press);
 * - celda VACÍA en el inicio (índice 0) -> no hace nada (límite de la palabra);
 * - índice fuera de [0, totalCeldas) -> no hace nada (defensivo).
 */
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