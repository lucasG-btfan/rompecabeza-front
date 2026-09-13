/**
 * Lógica pura del editor manual de crucigrama (C-09).
 *
 * Espejo deliberado (D7 REVISADO post-QA) de la validación del servidor:
 * - `validarPreview` traduce 1:1 `crucigrama_generator.py` (`cabe_palabra`,
 *   `check_fantasma`) y el orden de `validar_posicion` del editor, SIN
 *   conectividad obligatoria (opción C, D4 REVISADO). La AUTORIDAD final es
 *   el PUT (el backend re-valida); el preview solo anticipa el resultado.
 * - `anclarPalabra` implementa el snap (opción C, D7 REVISADO): genera TODOS
 *   los anclajes de cruce válidos (misma matemática que `_generar_candidatos`
 *   del generador con orientación fija), elige el más cercano al puntero y,
 *   si no existe ninguno, cae a colocación libre (primera letra en la celda
 *   del drop). Devuelve la posición completa `{fila, columna}`.
 * - NO descarta coordenadas negativas (D1 REVISADO): el PUT las acepta y
 *   `construir_grilla` traslada al bounding box mínimo al finalizar.
 * - `numerosDePista` replica `numerar_pistas` para la numeración provisional
 *   WYSIWYG (mismo barrido fila-major que persistirá `finalizar`).
 */

export type Orientacion = "H" | "V";

export interface CeldaEditor {
  fila: number;
  columna: number;
  letra: string;
}

export interface Colocada {
  palabra: string;
  posicion: { fila: number; columna: number };
  orientacion: Orientacion;
}

export interface AnclaCrucigrama {
  fila: number;
  columna: number;
}

const DELTAS: Record<Orientacion, { dr: number; dc: number }> = {
  H: { dr: 0, dc: 1 },
  V: { dr: 1, dc: 0 },
};

function claveCelda(fila: number, columna: number): string {
  return `${fila},${columna}`;
}

/** Celdas (fila, columna, letra) que una palabra ocuparía (mismo criterio que `cruzar`). */
export function celdasDePalabra(
  palabra: string,
  fila: number,
  columna: number,
  orientacion: Orientacion,
): CeldaEditor[] {
  const { dr, dc } = DELTAS[orientacion];
  return [...palabra].map((letra, i) => ({
    fila: fila + i * dr,
    columna: columna + i * dc,
    letra,
  }));
}

/** Mapa "fila,columna" -> letra de todas las palabras ya posicionadas (colocadasValidas). */
export function colocadasValidas(colocadas: Colocada[]): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const w of colocadas) {
    for (const celda of celdasDePalabra(w.palabra, w.posicion.fila, w.posicion.columna, w.orientacion)) {
      mapa.set(claveCelda(celda.fila, celda.columna), celda.letra);
    }
  }
  return mapa;
}

/** Celdas cubiertas por palabras H y V (mismo criterio que `_sets_por_orientacion`). */
function setsPorOrientacion(colocadas: Colocada[]): {
  celdasH: Set<string>;
  celdasV: Set<string>;
} {
  const celdasH = new Set<string>();
  const celdasV = new Set<string>();
  for (const w of colocadas) {
    const destino = w.orientacion === "H" ? celdasH : celdasV;
    for (const celda of celdasDePalabra(w.palabra, w.posicion.fila, w.posicion.columna, w.orientacion)) {
      destino.add(claveCelda(celda.fila, celda.columna));
    }
  }
  return { celdasH, celdasV };
}

export interface ConflictoPreview {
  fila: number;
  columna: number;
  motivo: string;
}

export interface ResultadoPreview {
  valido: boolean;
  conflictos: ConflictoPreview[];
}

/**
 * Replica la díada REVISADA de `validar_posicion` del servidor (cabida de
 * cruce -> anti-fantasma; SIN conectividad obligatoria — opción C, D4
 * REVISADO). A diferencia del servidor (que lanza en el primer fallo),
 * acumula TODOS los conflictos para pintarlos en rojo.
 */
export function validarPreview(
  colocadas: Colocada[],
  palabra: string,
  fila: number,
  columna: number,
  orientacion: Orientacion,
): ResultadoPreview {
  const provisionales = colocadasValidas(colocadas);
  const { celdasH, celdasV } = setsPorOrientacion(colocadas);
  const perpendiculares = orientacion === "H" ? celdasV : celdasH;
  const paralelas = orientacion === "H" ? celdasH : celdasV;
  const nuevas = celdasDePalabra(palabra, fila, columna, orientacion);
  const { dr, dc } = DELTAS[orientacion];
  const conflictos: ConflictoPreview[] = [];

  // 1. Cabida de cruce (`cabe_palabra`): cada celda ocupada debe ser un cruce
  //    perpendicular real con la MISMA letra.
  for (const celda of nuevas) {
    const clave = claveCelda(celda.fila, celda.columna);
    if (!provisionales.has(clave)) continue;
    if (paralelas.has(clave)) {
      conflictos.push({
        fila: celda.fila,
        columna: celda.columna,
        motivo: "No puede superponerse a una palabra de la misma orientación (paralela)",
      });
    } else if (!perpendiculares.has(clave)) {
      conflictos.push({
        fila: celda.fila,
        columna: celda.columna,
        motivo: "Superposición con una palabra sin cruce perpendicular",
      });
    } else if (provisionales.get(clave) !== celda.letra) {
      conflictos.push({
        fila: celda.fila,
        columna: celda.columna,
        motivo: `La letra en la intersección no coincide: se esperaba '${provisionales.get(clave)}' y la palabra coloca '${celda.letra}'`,
      });
    }
  }

  // 2. Anti-fantasma (`check_fantasma`): vecino perpendicular ocupado por una
  //    palabra paralela (salvo cruce legítimo) y continuación en línea.
  for (const celda of nuevas) {
    const clave = claveCelda(celda.fila, celda.columna);
    for (const signo of [1, -1]) {
      const vecina = claveCelda(celda.fila + signo * dc, celda.columna + signo * dr);
      if (provisionales.has(vecina) && (!perpendiculares.has(clave) || !perpendiculares.has(vecina))) {
        conflictos.push({
          fila: celda.fila,
          columna: celda.columna,
          motivo: "Riesgo de palabra fantasma (adyacente paralela o pegada en línea)",
        });
      }
    }
  }
  const antes = claveCelda(fila - dr, columna - dc);
  const despues = claveCelda(fila + dr * palabra.length, columna + dc * palabra.length);
  if (provisionales.has(antes) || provisionales.has(despues)) {
    conflictos.push({
      fila,
      columna,
      motivo: "Riesgo de palabra fantasma: se pega en línea a otra palabra",
    });
  }

  return { valido: conflictos.length === 0, conflictos };
}

/**
 * Snap opción C (D7 REVISADO post-QA): genera TODOS los anclajes de cruce
 * válidos posibles de la palabra arrastrada (cada letra de una palabra
 * EXISTENTE PERPENDICULAR que coincida con una letra de la arrastrada, misma
 * matemática que `_generar_candidatos` del generador, con la orientación fija
 * del arrastre). Filtra con `validarPreview` y elige el anclaje cuya posición
 * esté MÁS CERCANA a la celda de drop (distancia Manhattan; empates resueltos
 * por el orden de generación, determinista).
 *
 * Si NO existe ningún anclaje de cruce válido, cae a COLOCACIÓN LIBRE (opción
 * C): la primera letra va en la celda de drop, validada con `validarPreview`
 * (anti-paralela + anti-fantasma siguen aplicando).
 *
 * Devuelve la posición completa `{fila, columna}` o null si NI el snap ni la
 * colocación libre son válidos (drop bloqueado). NO descarta coordenadas
 * negativas (D1 REVISADO): el PUT las acepta y `construir_grilla` traslada al
 * bounding box mínimo al finalizar.
 */
export function anclarPalabra(
  colocadas: Colocada[],
  palabra: string,
  fila: number,
  col: number,
  orientacion: Orientacion,
): AnclaCrucigrama | null {
  const { dr, dc } = DELTAS[orientacion];
  const candidatos = new Map<string, AnclaCrucigrama>();

  // (a) Todos los anclajes de cruce: solo palabras perpendiculares (una
  // coincidencia sobre palabra paralela es superposición, inválida por
  // `validarPreview` de todos modos).
  for (const w of colocadas) {
    if (w.orientacion === orientacion) continue;
    for (const celda of celdasDePalabra(w.palabra, w.posicion.fila, w.posicion.columna, w.orientacion)) {
      for (let i = 0; i < palabra.length; i++) {
        if (palabra[i] !== celda.letra) continue;
        const anclaFila = celda.fila - i * dr;
        const anclaCol = celda.columna - i * dc;
        candidatos.set(claveCelda(anclaFila, anclaCol), { fila: anclaFila, columna: anclaCol });
      }
    }
  }

  // (b) Filtrar con la validación espejo y elegir el más cercano al puntero.
  const distancia = (a: AnclaCrucigrama) =>
    Math.abs(a.fila - fila) + Math.abs(a.columna - col);
  let mejor: AnclaCrucigrama | null = null;
  let mejorDist = Infinity;
  for (const ancla of candidatos.values()) {
    const preview = validarPreview(colocadas, palabra, ancla.fila, ancla.columna, orientacion);
    if (!preview.valido) continue;
    const d = distancia(ancla);
    if (d < mejorDist) {
      mejor = ancla;
      mejorDist = d;
    }
  }
  if (mejor) return mejor;

  // (c) Fallback: colocación libre con la primera letra en la celda de drop.
  const libre = validarPreview(colocadas, palabra, fila, col, orientacion);
  return libre.valido ? { fila, columna: col } : null;
}

export interface GrillaNormalizada {
  /** Coordenadas absolutas del borde superior-izquierdo del bounding box. */
  minFila: number;
  minCol: number;
  filas: number;
  columnas: number;
}

/** Bounding box mínimo de las palabras posicionadas (misma matemática que `construir_grilla`). */
export function normalizarGrilla(colocadas: Colocada[]): GrillaNormalizada | null {
  if (colocadas.length === 0) return null;
  let minFila = Infinity;
  let minCol = Infinity;
  let maxFila = -Infinity;
  let maxCol = -Infinity;
  for (const w of colocadas) {
    for (const celda of celdasDePalabra(w.palabra, w.posicion.fila, w.posicion.columna, w.orientacion)) {
      minFila = Math.min(minFila, celda.fila);
      minCol = Math.min(minCol, celda.columna);
      maxFila = Math.max(maxFila, celda.fila);
      maxCol = Math.max(maxCol, celda.columna);
    }
  }
  return { minFila, minCol, filas: maxFila - minFila + 1, columnas: maxCol - minCol + 1 };
}

/**
 * Numeración provisional 1..N en barrido fila-major sobre el canvas
 * NORMALIZADO (las celdas de inicio se numeran con la posición ya trasladada).
 * Espejo de `numerar_pistas` del servidor: la grilla que ve el creador muestra
 * los mismos números que persistirá `finalizar`.
 */
export function numerosDePista(colocadas: Colocada[]): Map<string, number> {
  const bbox = normalizarGrilla(colocadas);
  const numeros = new Map<string, number>();
  if (!bbox || colocadas.length === 0) return numeros;

  const inicios = new Set<string>();
  for (const w of colocadas) {
    inicios.add(
      claveCelda(w.posicion.fila - bbox.minFila, w.posicion.columna - bbox.minCol),
    );
  }

  let contador = 0;
  for (let f = 0; f < bbox.filas; f++) {
    for (let c = 0; c < bbox.columnas; c++) {
      const clave = claveCelda(f, c);
      if (inicios.has(clave)) {
        contador += 1;
        numeros.set(clave, contador);
      }
    }
  }
  return numeros;
}

/**
 * ¿El botón "Finalizar y generar grilla automáticamente" debe estar disponible?
 *
 * `finalizar` del servidor (C-09/C-11) aplica "todas o ninguna" sobre las
 * posiciones manuales: con CERO palabras posicionadas genera la grilla
 * automáticamente; con TODAS posicionadas usa el layout manual; con posiciones
 * parciales responde 400. La UI solo ofrece el camino automático cuando el
 * manual no aplica (nada posicionado) y el backend puede generar.
 */
export function botonFinalizarAuto(posicionadas: number, total: number): boolean {
  return total > 0 && posicionadas === 0;
}