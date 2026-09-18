import type { PalabraInput } from "../types";

/** Una fila de la UI del Dashboard (C-16): palabra + pista/palabra opcional.
 *  La palabra y la pista se trimean en el submit; una pista vacía NO viaja. */
export interface FilaPalabra {
  palabra: string;
  explicacion: string;
}

/** Tipo de partida para la conversión a PalabraInput[] (R3 vs R2). */
export type TipoCreacionFilas = "sopa" | "crucigrama";

/** Crea una fila vacía lista para cargar en el Dashboard. */
export function nuevaFila(): FilaPalabra {
  return { palabra: "", explicacion: "" };
}

/** Agrega una fila vacía al final SIN mutar el original (D2 — inmutabilidad). */
export function agregarFila(filas: FilaPalabra[]): FilaPalabra[] {
  return [...filas, nuevaFila()];
}

/** Quita la fila del índice pedido. Es no-op cuando queda una sola fila:
 *  no se puede dejar el form sin ninguna palabra. (D3 — el original intacto.) */
export function quitarFila(filas: FilaPalabra[], indice: number): FilaPalabra[] {
  if (filas.length <= 1) return filas;
  return filas.filter((_, i) => i !== indice);
}

/** Aplica un cambio parcial en el índice sin mutar el original (D2). */
export function actualizarFila(
  filas: FilaPalabra[],
  indice: number,
  cambio: Partial<FilaPalabra>,
): FilaPalabra[] {
  return filas.map((fila, i) => (i === indice ? { ...fila, ...cambio } : fila));
}

/** Convierte las filas de la UI en PalabraInput[] para el POST /partidas (C-16).
 *
 *  R3 (spec): en SÓPA NUNCA se manda `explicacion` aunque exista en el estado
 *  de la fila (la lista de palabras ES el juego). En CRUCIGRAMA solo viaja
 *  cuando la pista no quedó vacía tras el trim. Las filas vacías o de solo
 *  espacios se descartan; palabra y pista se trimean.
 */
export function filasAPalabras(filas: FilaPalabra[], tipo: TipoCreacionFilas): PalabraInput[] {
  const resultado: PalabraInput[] = [];

  for (const fila of filas) {
    const palabra = fila.palabra.trim();
    if (!palabra) continue;

    if (tipo === "crucigrama") {
      const explicacion = fila.explicacion.trim();
      if (explicacion) {
        resultado.push({ palabra, explicacion });
      } else {
        resultado.push({ palabra });
      }
    } else {
      resultado.push({ palabra });
    }
  }

  return resultado;
}
