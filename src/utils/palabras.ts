import type { PalabraInput } from "../types";

/**
 * Separa el texto del Dashboard en PalabraInput[] listos para el backend.
 *
 * - Los tokens se separan por coma o salto de línea.
 * - Opcionalmente cada token puede llevar una pista: "PALABRA: pista",
 *   "PALABRA — pista" o "PALABRA | pista" (el PRIMER separador encontrado
 *   divide; el resto queda en la pista).
 * - El guión simple ("-") NO separa: "CO-AUTOR" es una sola palabra.
 * - Tokens vacíos, o que no tienen palabra antes del separador, se descartan.
 * - Si la pista queda vacía tras el trim, no se manda la key `explicacion`
 *   (el backend la trata como ausente, no como string vacío).
 */
export function parsearPalabras(texto: string): PalabraInput[] {
  const separadores = /[:—|]/;

  const resultado: PalabraInput[] = [];

  for (const token of texto.split(/[,\n]/)) {
    const limpio = token.trim();
    if (!limpio) continue;

    const idx = limpio.search(separadores);
    if (idx === -1) {
      resultado.push({ palabra: limpio });
      continue;
    }

    const palabra = limpio.slice(0, idx).trim();
    const pista = limpio.slice(idx + 1).trim();
    if (!palabra) continue;

    if (pista) {
      resultado.push({ palabra, explicacion: pista });
    } else {
      resultado.push({ palabra });
    }
  }

  return resultado;
}