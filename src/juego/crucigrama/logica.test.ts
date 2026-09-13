/**
 * Tests de la lógica pura del crucigrama JUGABLE (C-10, D5).
 *
 * Trabaja contra el contrato D6 (grilla {celdas, palabras} del GET /estado)
 * con el layout determinista PATO/ORO/AS de C-09 (3 filas x 4 columnas):

 *     P A T O    PATO H (0,0) -> pista 1
 *       S   R    AS   V (0,1) -> pista 2
 *           O    ORO  V (0,3) -> pista 3
 *
 * Índices planos (fila-major, como las almacena el backend):
 *   idx 0 (0,0) P | idx 1 (0,1) A | idx 2 (0,2) T | idx 3 (0,3) O
 *   idx 4 (1,0) - | idx 5 (1,1) S | idx 6 (1,2) - | idx 7 (1,3) R
 *   idx 8 (2,0) - | idx 9 (2,1) - | idx10 (2,2) - | idx11 (2,3) O
 *
 * La lógica NUNCA toca la red ni la BD: es pura y determinista, igual que
 * `editor/logica.ts` (C-09).
 */

import { describe, expect, it } from "vitest";
import type {
  EstadoPalabra,
  GrillaCrucigrama,
  PalabraGrilla,
} from "../../types";
import {
  armarTablero,
  celdasDeEncontradas,
  celdasDePalabraGrilla,
  idsEncontrados,
  indiceTrasBorrado,
  palabraEnCelda,
  respuestaDePalabra,
  siguienteCeldaVacia,
} from "./logica";

function celda(
  letra: string | null,
  numero: number | null,
  tipo: "letra" | "negra",
) {
  return { letra, numero, tipo };
}

/** Grilla D6 del layout PATO/ORO/AS (celdas en fila-major). */
function grillaPato(): GrillaCrucigrama {
  return {
    celdas: [
      celda("P", 1, "letra"),
      celda("A", 2, "letra"),
      celda("T", null, "letra"),
      celda("O", 3, "letra"),
      celda(null, null, "negra"),
      celda("S", null, "letra"),
      celda(null, null, "negra"),
      celda("R", null, "letra"),
      celda(null, null, "negra"),
      celda(null, null, "negra"),
      celda(null, null, "negra"),
      celda("O", null, "letra"),
    ],
    palabras: [
      { numero: 1, orientacion: "H", posicion: { fila: 0, columna: 0 }, longitud: 4, texto: null },
      { numero: 2, orientacion: "V", posicion: { fila: 0, columna: 1 }, longitud: 2, texto: null },
      { numero: 3, orientacion: "V", posicion: { fila: 0, columna: 3 }, longitud: 3, texto: null },
    ],
  };
}

function palabraPato(): PalabraGrilla {
  return grillaPato().palabras[0];
}

describe("armarTablero", () => {
  it("arma la matriz fila x columna desde las celdas planas del D6", () => {
    const tablero = armarTablero(grillaPato());

    // Dimensiones derivadas del bounding box de las palabras (3x4).
    expect(tablero).toHaveLength(3);
    expect(tablero[0]).toHaveLength(4);

    // Celdas de letra con su contenido e índice plano.
    expect(tablero[0][0]).toEqual(
      expect.objectContaining({ letra: "P", numero: 1, tipo: "letra", indice: 0 }),
    );
    expect(tablero[2][3]).toEqual(
      expect.objectContaining({ letra: "O", numero: null, tipo: "letra", indice: 11 }),
    );

    // Negras mapeadas a su lugar (fila-major) con indice correcto.
    expect(tablero[1][0]).toEqual(
      expect.objectContaining({ letra: null, numero: null, tipo: "negra", indice: 4 }),
    );
    expect(tablero[2][2].tipo).toBe("negra");
  });
});

describe("palabraEnCelda", () => {
  it("devuelve la palabra horizontal que cubre la celda", () => {
    const p = palabraEnCelda(grillaPato(), 0, 2, "H");
    expect(p?.numero).toBe(1);
    expect(p?.orientacion).toBe("H");
  });

  it("devuelve la palabra vertical que cubre la celda", () => {
    const p = palabraEnCelda(grillaPato(), 1, 3, "V");
    expect(p?.numero).toBe(3);
    expect(p?.orientacion).toBe("V");
  });

  it("en un cruce respeta la preferencia de orientación (toggle H/V)", () => {
    // (0,1) pertenece a PATO (H) y a AS (V).
    expect(palabraEnCelda(grillaPato(), 0, 1, "H")?.numero).toBe(1);
    expect(palabraEnCelda(grillaPato(), 0, 1, "V")?.numero).toBe(2);
  });

  it("devuelve null en una celda negra", () => {
    expect(palabraEnCelda(grillaPato(), 1, 0, "H")).toBeNull();
  });
});

describe("celdasDePalabraGrilla", () => {
  it("calcula las celdas de una palabra horizontal grilla (longitud, no letras)", () => {
    expect(celdasDePalabraGrilla(palabraPato())).toEqual([
      { fila: 0, columna: 0 },
      { fila: 0, columna: 1 },
      { fila: 0, columna: 2 },
      { fila: 0, columna: 3 },
    ]);
  });

  it("calcula las celdas de una palabra vertical", () => {
    expect(celdasDePalabraGrilla(grillaPato().palabras[2])).toEqual([
      { fila: 0, columna: 3 },
      { fila: 1, columna: 3 },
      { fila: 2, columna: 3 },
    ]);
  });
});

describe("respuestaDePalabra", () => {
  function letras(...pares: [string, string][]): Map<string, string> {
    return new Map(pares.map(([clave, l]) => [clave, l]));
  }

  it("concatena las letras tipeadas de la palabra en orden", () => {
    const mapa = letras(
      ["0,0", "P"],
      ["0,1", "A"],
      ["0,2", "T"],
      ["0,3", "O"],
    );
    expect(respuestaDePalabra(palabraPato(), mapa)).toBe("PATO");
  });

  it("devuelve null si la palabra está incompleta", () => {
    const mapa = letras(["0,0", "P"], ["0,1", "A"]);
    expect(respuestaDePalabra(palabraPato(), mapa)).toBeNull();
  });
});

describe("siguienteCeldaVacia", () => {
  const celdasPato = celdasDePalabraGrilla(palabraPato());

  it("avanza a la siguiente celda vacía desde la recién llenada", () => {
    const mapa = new Map<string, string>([
      ["0,0", "P"],
      ["0,1", "A"],
      ["0,2", "T"],
    ]);
    expect(siguienteCeldaVacia(celdasPato, mapa, 2)).toEqual({ fila: 0, columna: 3 });
  });

  it("vuelve al inicio (wrap) si hay vacías antes del índice", () => {
    const mapa = new Map<string, string>([
      ["0,0", "P"],
      ["0,2", "T"],
      ["0,3", "O"],
    ]);
    expect(siguienteCeldaVacia(celdasPato, mapa, 3)).toEqual({ fila: 0, columna: 1 });
  });

  it("devuelve null si la palabra está completa", () => {
    const mapa = new Map<string, string>([
      ["0,0", "P"],
      ["0,1", "A"],
      ["0,2", "T"],
      ["0,3", "O"],
    ]);
    expect(siguienteCeldaVacia(celdasPato, mapa, 3)).toBeNull();
  });
});

describe("idsEncontrados", () => {
  it("une las encontradas del backend con las del localStorage (invitado)", () => {
    const estadoPalabras: EstadoPalabra[] = [
      { id: "a", palabra: null, encontrada: true },
      { id: "b", palabra: null, encontrada: false },
      { id: "c", palabra: null, encontrada: false },
    ];
    const locales = [{ id: "c" as string, posicion: null, letras: "PATO" }];

    const ids = idsEncontrados(estadoPalabras, locales);
    expect(ids.has("a")).toBe(true);
    expect(ids.has("b")).toBe(false);
    expect(ids.has("c")).toBe(true); // solo la local
  });
});

describe("celdasDeEncontradas", () => {
  it("marca las celdas de las palabras encontradas por su numero de pista", () => {
    // PATO (pista 1) encontrada, AS (2) y ORO (3) no.
    const celdas = celdasDeEncontradas(grillaPato().palabras, new Set([1]));

    expect(celdas.has("0,0")).toBe(true);
    expect(celdas.has("0,1")).toBe(true);
    expect(celdas.has("0,2")).toBe(true);
    expect(celdas.has("0,3")).toBe(true);
    // AS comparte la (0,1) pero sus propias celdas no están reveladas.
    expect(celdas.has("1,1")).toBe(false);
    expect(celdas.has("1,3")).toBe(false);
    expect(celdas.has("2,3")).toBe(false);
    expect(celdas.size).toBe(4);
  });
});

describe("indiceTrasBorrado — backspace (C-11, defecto QA)", () => {
  // Contrato (spec crucigrama-juego: "Backspace borra la letra actual y
  // retrocede"): UN backspace borra UNA letra y deja el foco en la celda
  // recién vaciada, caminando así hasta el inicio de la palabra.
  it("celda CON letra en el medio: borra esa letra y el foco queda en la celda vaciada", () => {
    expect(indiceTrasBorrado(3, true, 5)).toEqual({ indiceBorrado: 3, nuevoFoco: 3 });
  });

  it("celda CON letra en el índice 0 (caso aislado): borra y el foco queda en 0", () => {
    expect(indiceTrasBorrado(0, true, 5)).toEqual({ indiceBorrado: 0, nuevoFoco: 0 });
  });

  it("celda CON letra en la ÚLTIMA celda: borra y el foco queda en la última", () => {
    expect(indiceTrasBorrado(4, true, 5)).toEqual({ indiceBorrado: 4, nuevoFoco: 4 });
  });

  it("celda VACÍA no-inicio: retrocede UNA celda y borra la letra anterior en el mismo press", () => {
    // "liona": primer backspace borra la 'a' (4) y deja el foco en 4 (vacía);
    // el segundo backspace desde 4 (vacía) debe retroceder a 3 Y borrar la 'n'.
    expect(indiceTrasBorrado(4, false, 5)).toEqual({ indiceBorrado: 3, nuevoFoco: 3 });
  });

  it("celda VACÍA en el inicio (índice 0): no hace nada (límite de la palabra)", () => {
    expect(indiceTrasBorrado(0, false, 5)).toEqual({ indiceBorrado: null, nuevoFoco: 0 });
  });

  it("índice fuera de rango (=== totalCeldas): no hace nada (defensivo)", () => {
    expect(indiceTrasBorrado(5, false, 5)).toEqual({ indiceBorrado: null, nuevoFoco: 5 });
    expect(indiceTrasBorrado(-1, true, 5)).toEqual({ indiceBorrado: null, nuevoFoco: -1 });
  });
});