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
  GrillaCrucigrama,
  PalabraGrilla,
} from "../../types";
import {
  armarTablero,
  celdaAdyacente,
  celdasDeEncontradas,
  celdasDePalabraGrilla,
  describirCelda,
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

describe("celdaAdyacente (C-12, D3)", () => {
  // contrato spec crucigrama-juego: "una flecha en eje perpendicular enfoca la
  // celda adyacente a la actual y activa la palabra que la cubre si existe".
  // Devuelve null si el destino cae fuera de la grilla o es una celda negra
  // (no hay palabra que cubrir ahí). Los casos del EJE de la palabra activa
  // no son su responsabilidad (el hook los maneja con celdas[indice +/- 1]):
  // devuelve null (defensivo) para no romper si el caller se equivoca.
  //
  // Layout PATO/ORO/AS (3x4):
  //   PATO H (0,0)-(0,3); AS V (0,1),(1,1); ORO V (0,3),(1,3),(2,3);
  //   negras: (1,0), (1,2), (2,0), (2,1), (2,2).
  const tablero = () => armarTablero(grillaPato());

  it("H + ArrowDown salta a la celda de abajo (perpendicular)", () => {
    // Desde (0,1) (A de PATO) hacia abajo cae en (1,1) (S de AS).
    expect(celdaAdyacente(0, 1, "H", "ArrowDown", tablero())).toEqual({ fila: 1, columna: 1 });
  });

  it("H + ArrowUp salta a la celda de arriba (perpendicular)", () => {
    expect(celdaAdyacente(1, 1, "H", "ArrowUp", tablero())).toEqual({ fila: 0, columna: 1 });
  });

  it("H + ArrowDown sobre una celda negra devuelve null", () => {
    // Desde (0,0) (P) hacia abajo cae en (1,0), negra.
    expect(celdaAdyacente(0, 0, "H", "ArrowDown", tablero())).toBeNull();
  });

  it("V + ArrowRight salta a la celda de la derecha (perpendicular)", () => {
    // Desde (0,1) (A de AS) hacia la derecha cae en (0,2) (T de PATO).
    expect(celdaAdyacente(0, 1, "V", "ArrowRight", tablero())).toEqual({ fila: 0, columna: 2 });
  });

  it("V + ArrowLeft salta a la celda de la izquierda (perpendicular)", () => {
    expect(celdaAdyacente(0, 1, "V", "ArrowLeft", tablero())).toEqual({ fila: 0, columna: 0 });
  });

  it("V + ArrowRight sobre una celda negra devuelve null", () => {
    // Desde (1,1) (S de AS) a la derecha cae en (1,2), negra.
    expect(celdaAdyacente(1, 1, "V", "ArrowRight", tablero())).toBeNull();
  });

  it("V + ArrowLeft sobre una celda negra devuelve null", () => {
    expect(celdaAdyacente(1, 1, "V", "ArrowLeft", tablero())).toBeNull();
  });

  it("borde superior: H + ArrowUp desde la fila 0 devuelve null", () => {
    expect(celdaAdyacente(0, 1, "H", "ArrowUp", tablero())).toBeNull();
  });

  it("borde inferior: H + ArrowDown desde la última fila devuelve null", () => {
    expect(celdaAdyacente(2, 3, "H", "ArrowDown", tablero())).toBeNull();
  });

  it("borde izquierdo: V + ArrowLeft desde la columna 0 devuelve null", () => {
    expect(celdaAdyacente(0, 0, "V", "ArrowLeft", tablero())).toBeNull();
  });

  it("borde derecho: V + ArrowRight desde la última columna devuelve null", () => {
    expect(celdaAdyacente(1, 3, "V", "ArrowRight", tablero())).toBeNull();
  });

  it("flecha del EJE de la palabra activa devuelve null (la maneja el hook)", () => {
    expect(celdaAdyacente(0, 1, "H", "ArrowLeft", tablero())).toBeNull();
    expect(celdaAdyacente(0, 1, "H", "ArrowRight", tablero())).toBeNull();
    expect(celdaAdyacente(0, 1, "V", "ArrowUp", tablero())).toBeNull();
    expect(celdaAdyacente(0, 1, "V", "ArrowDown", tablero())).toBeNull();
  });
});

describe("describirCelda (C-12, D5 — aria-label, spec accesibilidad)", () => {
  // Contrato de la spec: "Número 3, fila 2, columna 4, letra A, encontrada";
  // "Celda negra". La FILA/COLUMNA del label son 1-based (lector de pantalla:
  // la celda (0,1) del layout es "fila 1, columna 2").

  it("celda negra → 'Celda negra'", () => {
    const t = armarTablero(grillaPato());
    expect(describirCelda(t[1][0], 2, 1)).toBe("Celda negra");
  });

  it("vacía con número de pista → 'Celda vacía, número 1, fila 1, columna 1'", () => {
    expect(describirCelda(celda(null, 1, "letra"), 1, 1)).toBe(
      "Celda vacía, número 1, fila 1, columna 1",
    );
  });

  it("vacía sin número → omite la parte del número", () => {
    expect(describirCelda(celda(null, null, "letra"), 1, 3)).toBe(
      "Celda vacía, fila 1, columna 3",
    );
  });

  it("letra (normal) → 'Número 1, fila 1, columna 1, letra P'", () => {
    expect(describirCelda(celda("P", 1, "letra"), 1, 1)).toBe(
      "Número 1, fila 1, columna 1, letra P",
    );
  });

  it("letra encontrada → agrega el estado al final (ejemplo literal de la spec)", () => {
    const t = armarTablero(grillaPato());
    expect(describirCelda(t[0][0], 1, 1, "encontrada")).toBe(
      "Número 1, fila 1, columna 1, letra P, encontrada",
    );
  });

  it("letra en error → agrega 'error' como estado", () => {
    expect(describirCelda(celda("P", 1, "letra"), 1, 1, "error")).toBe(
      "Número 1, fila 1, columna 1, letra P, error",
    );
  });

  it("letra sin número → 'fila 1, columna 3, letra T'", () => {
    expect(describirCelda(celda("T", null, "letra"), 1, 3)).toBe(
      "fila 1, columna 3, letra T",
    );
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