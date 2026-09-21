/**
 * Lógica pura del crucigrama JUGABLE (C-10, D5).
 *
 * Opera sobre el contrato D6 (`GrillaCrucigrama` = {celdas planas, palabras})
 * que devuelve el GET /estado, SIN tocar red ni BD. Todo es determinista y
 * testeable con vitest, igual que `editor/logica.ts` (C-09).
 *
 * MECÁNICA DE JUEGO (tablero, celdas, entrada, borrado, encontradas). La
 * RESOLUCIÓN DE PISTAS (puente numero→id, caché, explicaciones) vive en
 * `pistas.ts` (c-21): separada por responsabilidad — regla dura 8.
 *
 * Responsabilidades que NO le tocan a este módulo (viven en el componente):
 * - persistir el progreso del invitado (localStorage),
 * - llamar `responderPalabra` al backend,
 * - renderizar / manejar eventos del DOM.
 */

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

/** Flechas de teclado aceptadas por `celdaAdyacente` (solo eje perpendicular). */
export type FlechaTeclado = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

/** Delta de la navegación PERPENDICULAR: si la palabra activa es H, ArrowUp/
 * ArrowDown recorren las filas (cruzando a las palabras verticales vecinas);
 * si es V, ArrowLeft/ArrowRight recorren las columnas. Las flechas del MISMO
 * eje de la palabra no pertenecen a esta función (el hook las resuelve con
 * `celdas[indice +/- 1]`): valen null (defensivo).
 */
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

/**
 * Celda vecina en eje PERPENDICULAR a la palabra activa (C-12, D3, spec
 * crucigrama-juego: "una flecha en eje perpendicular enfoca la celda adyacente
 * a la actual... el foco nunca queda atrapado en el eje de la palabra activa").
 *
 * Devuelve `null` cuando no hay celda a la cual enfocar:
 * - el destino cae fuera de la grilla (borde);
 * - la celda destino es negra (ninguna palabra la cubre);
 * - la flecha pertenece al EJE de la palabra activa (responsabilidad del hook).
 *
 * Firma: 4 args documentados + `tablero` (CeldaTablero[][]) para conocer las
 * dimensiones reales y poder resolver los bordes como función pura (desvío
 * documentado del design, ver docs de C-12).
 */
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

/** Celdas "fila,col" a pintar como encontradas, dadas las CLAVES por palabra
 *  (c-21, D4): `Set<ClavePista>` en vez del viejo `Set<number>` de numeros.
 *  Con `Set<number>` un par colisionante H+V (mismo inicio, mismo numero) se
 *  pintaba COMPLETO apenas una de las dos palabras se encontraba; por clave se
 *  pinta SOLO la palabra encontrada (desviación documentada del design D2). */
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

/** Estado de la celda para el aria-label (spec accesibilidad C-12 D5):
 * "letra" (normal), "encontrada" o "error". "negra"/"vacía" se derivan del
 * contenido de la celda, no del estado. */
export type EstadoCeldaLabel = "letra" | "encontrada" | "error";

/**
 * Aria-label descriptivo de una celda del crucigrama (C-12, D5, spec
 * accesibilidad): "Número 3, fila 2, columna 4, letra A, encontrada" / "Celda
 * negra" / "Celda vacía, número 1, fila 1, columna 1".
 *
 * - La FILA/COLUMNA del label son 1-based (el lector de pantalla las presenta
 *   como el usuario las ve en la pista: "1-A", "2-V"); la celda de índice
 *   (0,1) del layout se describe como "fila 1, columna 2".
 * - `celda.letra` debe ser la letra VISIBLE (tipeada o revelada por acierto),
 *   nunca la solución oculta de una palabra no encontrada (anti-cheat por
 *   accesibilidad) — el caller arma la celda visible antes de llamarla.
 */
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
  // "Número" con mayúscula inicial (inicio de la frase, ej. de la spec:
  // "Número 3, fila 2, columna 4, letra A, encontrada").
  const numero = celda.numero != null ? `Número ${celda.numero}, ` : "";
  return `${numero}${posicion}, letra ${celda.letra}${sufijo}`;
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