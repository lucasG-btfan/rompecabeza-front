/**
 * Lógica pura de la Sopa de Letras.
 *
 * Separada del componente para poder testearla sin renderizar nada.
 * Acá vive la "deducción de palabra": dado un par de celdas que el jugador
 * marcó (inicio → fin), averiguamos qué palabra de la lista corresponde,
 * leyendo las letras de la grilla y comparándolas contra cada palabra.
 */

export interface Celda {
  fila: number;
  columna: number;
}

/**
 * Devuelve las celdas en línea recta (misma fila, misma columna o diagonal de
 * 45°) desde `inicio` hasta `fin`, ordenadas de inicio a fin.
 * Devuelve null si el segmento no es recto ni diagonal.
 */
export function obtenerCeldasLineales(
  inicio: Celda,
  fin: Celda,
): Celda[] | null {
  const { fila: f1, columna: c1 } = inicio;
  const { fila: f2, columna: c2 } = fin;

  const difF = f2 - f1;
  const difC = c2 - c1;

  // Recta, vertical o diagonal: una de las dos diferencias debe ser 0,
  // o ambas iguales en valor absoluto (diagonal 45°).
  const esHorizontal = difF === 0;
  const esVertical = difC === 0;
  const esDiagonal =
    !esHorizontal && !esVertical && Math.abs(difF) === Math.abs(difC);

  if (!(esHorizontal || esVertical || esDiagonal)) return null;

  const pasoF = Math.sign(difF);
  const pasoC = Math.sign(difC);
  const pasos = Math.max(Math.abs(difF), Math.abs(difC));

  const celdas: Celda[] = [];
  for (let i = 0; i <= pasos; i++) {
    celdas.push({ fila: f1 + pasoF * i, columna: c1 + pasoC * i });
  }
  return celdas;
}

/**
 * Lee las letras de la grilla a lo largo del segmento inicio→fin.
 * Devuelve null si alguna celda queda fuera de la grilla.
 */
export function textoDeSeleccion(
  grilla: string[][],
  inicio: Celda,
  fin: Celda,
): string | null {
  const celdas = obtenerCeldasLineales(inicio, fin);
  if (!celdas) return null;

  let texto = "";
  for (const celda of celdas) {
    const fila = grilla[celda.fila];
    if (!fila) return null;
    const letra = fila[celda.columna];
    if (letra === undefined) return null;
    texto += letra;
  }
  return texto;
}

export interface PalabraCandidata {
  id: string;
  texto: string; // la palabra en mayúsculas
  encontrada: boolean;
}

export interface Deduccion {
  palabraId: string;
  texto: string;
}

/**
 * Dado un mapa de palabras candidatas, la grilla y una selección (inicio→fin),
 * devuelve la palabra que coincide con la selección, en cualquiera de los dos
 * sentidos (la palabra puede estar escrita al revés). Devuelve null si la
 * selección no corresponde a ninguna palabra pendiente.
 */
export function deducirPalabra(
  palabras: PalabraCandidata[],
  grilla: string[][],
  inicio: Celda,
  fin: Celda,
): Deduccion | null {
  const texto = textoDeSeleccion(grilla, inicio, fin);
  if (!texto) return null;

  for (const p of palabras) {
    if (p.encontrada) continue;
    if (p.texto.length !== texto.length) continue;
    if (p.texto === texto || p.texto === invertir(texto)) {
      return { palabraId: p.id, texto };
    }
  }
  return null;
}

function invertir(s: string): string {
  return s.split("").reverse().join("");
}

export interface PosicionPalabra {
  fila: number;
  columna: number;
  orientacion: string; // "E","O","N","S","SE","SO","NE","NO"
}

/**
 * Calcula las celdas (fila, columna) que ocupa una palabra ya posicionada en la
 * grilla, usando su punto de inicio + orientación + largo. Esto nos permite
 * resaltar en el tablero las palabras que cada jugador ya encontró.
 */
export function obtenerCeldasDePalabra(
  posicion: PosicionPalabra,
  largo: number,
): Celda[] {
  const { fila, columna, orientacion } = posicion;
  const dirs: Record<string, Celda> = {
    // (paso en fila, paso en columna); la fila crece hacia abajo.
    E: { fila: 0, columna: 1 },
    O: { fila: 0, columna: -1 },
    S: { fila: 1, columna: 0 },
    N: { fila: -1, columna: 0 },
    SE: { fila: 1, columna: 1 },
    SO: { fila: 1, columna: -1 },
    NE: { fila: -1, columna: 1 },
    NO: { fila: -1, columna: -1 },
  };
  const paso = dirs[orientacion] ?? { fila: 0, columna: 1 };

  const celdas: Celda[] = [];
  for (let i = 0; i < largo; i++) {
    celdas.push({ fila: fila + paso.fila * i, columna: columna + paso.columna * i });
  }
  return celdas;
}
