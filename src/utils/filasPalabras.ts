import type { PalabraInput } from "../types";

export interface FilaPalabra {
  palabra: string;
  explicacion: string;
}

export type TipoCreacionFilas = "sopa" | "crucigrama";

export function nuevaFila(): FilaPalabra {
  return { palabra: "", explicacion: "" };
}

export function agregarFila(filas: FilaPalabra[]): FilaPalabra[] {
  return [...filas, nuevaFila()];
}

export function quitarFila(filas: FilaPalabra[], indice: number): FilaPalabra[] {
  if (filas.length <= 1) return filas;
  return filas.filter((_, i) => i !== indice);
}

export function actualizarFila(
  filas: FilaPalabra[],
  indice: number,
  cambio: Partial<FilaPalabra>,
): FilaPalabra[] {
  return filas.map((fila, i) => (i === indice ? { ...fila, ...cambio } : fila));
}

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
