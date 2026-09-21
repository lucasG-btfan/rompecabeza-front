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
import { idsEncontrados } from "../compartido/progreso";
import type {
  CeldaGrilla,
  EstadoPalabra,
  GrillaCrucigrama,
  PalabraGrilla,
  Posicion,
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
// Fix c-21 (D3 con escape de regla dura 8): la resolución de pistas vive en
// `pistas.ts` (split por responsabilidad — `logica.ts` quedaba en ~585 líneas,
// reventando el tope de 400). Los miembros c-21 se importan de ahí.
import {
  clavePista,
  idsCandidatos,
  resolverIdPorValidacion,
  resolverPistas,
} from "./pistas";
// Namespace para los tipos y funciones restantes del fix c-21.
import * as logicaC21 from "./pistas";

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

/** Estado de una palabra tal como viaja en GET /estado bajo C-14 (progreso
 *  efímero): `encontrada=False, posicion=None` SIEMPRE, salvo que el test
 *  revele una posicion para ejercitar el camino estático por orientacion. */
function estadoPalabra(
  id: string,
  numero: number | null,
  posicion?: Posicion | null,
): EstadoPalabra {
  return {
    id,
    palabra: null,
    numero,
    encontrada: false,
    posicion: posicion ?? null,
  };
}

/**
 * Grilla con DOS palabras que inician en la MISMA celda (2,3) y comparten
 * numero de pista 9 (numeración fila-major del backend, correcta): una H de
 * longitud 4 y una V de longitud 3. Reproduce el escenario QKL3K7 del PO.
 *
 *     columnas 0 1 2 3 4 5 6
 *     fila 0    . A B C D . .
 *     fila 1    . . . . . . .
 *     fila 2    . . . 9 X Y Z
 *     fila 3    . . . V . . .
 *     fila 4    . . . V . . .
 *
 * H9: (2,3)..(2,6) — V9: (2,3),(3,3),(4,3). Solo comparten la celda de inicio.
 */
function grillaConColision(): GrillaCrucigrama {
  const filas = 5;
  const columnas = 7;
  const celdas: CeldaGrilla[] = [];
  const esLetra = (f: number, c: number) =>
    (f === 2 && c >= 3 && c <= 6) || // H9
    (c === 3 && f >= 2 && f <= 4) || // V9
    (f === 0 && c >= 1 && c <= 4); // PATO único (pista 1)
  const numero = (f: number, c: number): number | null => {
    if (f === 2 && c === 3) return 9;
    if (f === 0 && c === 1) return 1;
    return null;
  };
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      celdas.push({
        letra: esLetra(f, c) ? "A" : null,
        numero: esLetra(f, c) ? numero(f, c) : null,
        tipo: esLetra(f, c) ? "letra" : "negra",
      });
    }
  }
  return {
    celdas,
    palabras: [
      { numero: 1, orientacion: "H", posicion: { fila: 0, columna: 1 }, longitud: 4, texto: null },
      { numero: 9, orientacion: "H", posicion: { fila: 2, columna: 3 }, longitud: 4, texto: null },
      { numero: 9, orientacion: "V", posicion: { fila: 2, columna: 3 }, longitud: 3, texto: null },
    ],
  };
}

/** Palabras de un estado mínimo como las recibe `resolverPistas`. */
function estadoDePalabras(...palabras: EstadoPalabra[]): { palabras: EstadoPalabra[] } {
  return { palabras };
}

/** El estado del par colisionante tal como viaja bajo C-14: dos ids con
 *  numero 9, SIN posicion (no hay señal estática de orientacion). */
function estadoParColisionante(): { palabras: EstadoPalabra[] } {
  return estadoDePalabras(
    estadoPalabra("id-h9", 9),
    estadoPalabra("id-v9", 9),
  );
}

/** PistasResueltas armada a mano para casos límite de la resolución. */
function pistasManual(): logicaC21.PistasResueltas {
  return {
    porClave: new Map(),
    pendientes: new Map(),
    colisiones: new Set(),
  };
}

/** H9 y V9 de la grilla con colisión, para pasar a funciones por-palabra. */
function palabrasDeParColisionante(): {
  h9: PalabraGrilla;
  v9: PalabraGrilla;
} {
  const palabras = grillaConColision().palabras;
  const h9 = palabras.find((p) => p.numero === 9 && p.orientacion === "H");
  const v9 = palabras.find((p) => p.numero === 9 && p.orientacion === "V");
  if (!h9 || !v9) throw new Error("fixture: falta H9/V9 en grillaConColision");
  return { h9, v9 };
}

/** partida.palabras con explicaciones DISTINTAS para cada id del par 9. */
function partidaConPar(): { palabras: { id: string; explicacion: string }[] } {
  return {
    palabras: [
      { id: "id-h9", explicacion: "EXPLICACION DE LA HORIZONTAL NUEVE" },
      { id: "id-v9", explicacion: "explicacion de la vertical nueve" },
    ],
  };
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
  it("marca las celdas de la palabra encontrada por su clave (numero, orientacion)", () => {
    // PATO (1:H) encontrada; AS (2:V) y ORO (3:V) no.
    const celdas = celdasDeEncontradas(grillaPato().palabras, new Set(["1:H"]));

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

  it("par colisionante resolto: 9:H pinta SOLO las celdas de la H, 9:V SOLO las de la V (per-word, no per-numero)", () => {
    const palabras = grillaConColision().palabras;

    const conH = celdasDeEncontradas(palabras, new Set(["9:H"]));
    // H9 = (2,3),(2,4),(2,5),(2,6)
    expect(conH.has("2,3")).toBe(true);
    expect(conH.has("2,6")).toBe(true);
    // V9 = (2,3),(3,3),(4,3): sus celdas exclusivas NO se pintan
    expect(conH.has("3,3")).toBe(false);
    expect(conH.has("4,3")).toBe(false);

    const conV = celdasDeEncontradas(palabras, new Set(["9:V"]));
    expect(conV.has("3,3")).toBe(true);
    expect(conV.has("4,3")).toBe(true);
    // La H no está: sus celdas exclusivas NO se pintan
    expect(conV.has("2,4")).toBe(false);
    expect(conV.has("2,5")).toBe(false);
    expect(conV.has("2,6")).toBe(false);
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

describe("clavePista (D4 — clave compuesta B1 numero:orientacion)", () => {
  it("formatea la clave 'numero:orientacion' para H y V", () => {
    expect(clavePista(9, "H")).toBe("9:H");
    expect(clavePista(9, "V")).toBe("9:V");
    expect(clavePista(1, "H")).toBe("1:H");
  });
});

describe("resolverPistas (D2.1 — armado estático)", () => {
  it("RED BUG: un par colisionante (H9/V9 mismo inicio, sin posicion) NO se pisa en el armado estático: queda pendiente y marcado como colisión", () => {
    const grilla = grillaConColision();

    // El par viaja bajo C-14 como dos EstadoPalabra numero 9 SIN posicion
    // (no hay señal estática de orientacion — el hallazgo técnico del design).
    const pistas = resolverPistas(grilla, estadoParColisionante());

    // NUNCA una palabra pisa a la otra: ninguna clave "9:H"/"9:V" queda
    // asignada estáticamente (no se puede saber cuál id es cuál).
    expect(pistas.porClave.has("9:H")).toBe(false);
    expect(pistas.porClave.has("9:V")).toBe(false);

    // La colisión queda explícita para el plano dinámico (D2):
    expect(pistas.colisiones.has(9)).toBe(true);
    const pendientes = pistas.pendientes.get(9) ?? [];
    expect(pendientes).toHaveLength(2);
    // AMBOS ids sobreviven (ninguna pisada): el plano dinámico necesita
    // poder probar los dos candidatos.
    expect(new Set(pendientes.map((p) => p.id))).toEqual(new Set(["id-h9", "id-v9"]));
  });

  it("resuelve por exclusion los numeros unicos de la grilla (layout PATO/ORO/AS)", () => {
    const estado = estadoDePalabras(
      estadoPalabra("id-pato", 1),
      estadoPalabra("id-as", 2),
      estadoPalabra("id-oro", 3),
    );
    const pistas = resolverPistas(grillaPato(), estado);

    // Cada EstadoPalabra casa con SU PalabraGrilla por el unico numero:
    expect(pistas.porClave.get("1:H")).toBe("id-pato");
    expect(pistas.porClave.get("2:V")).toBe("id-as");
    expect(pistas.porClave.get("3:V")).toBe("id-oro");
    expect(pistas.pendientes.size).toBe(0);
    expect(pistas.colisiones.size).toBe(0);
  });

  it("NO depende del orden de estado.palabras (contrato: nunca desambiguar por indice)", () => {
    // Mismo set de ids, orden revuelto contra el de la grilla:
    const revuelto = estadoDePalabras(
      estadoPalabra("id-oro", 3),
      estadoPalabra("id-pato", 1),
      estadoPalabra("id-as", 2),
    );
    const pistas = resolverPistas(grillaPato(), revuelto);

    expect(pistas.porClave.get("1:H")).toBe("id-pato");
    expect(pistas.porClave.get("2:V")).toBe("id-as");
    expect(pistas.porClave.get("3:V")).toBe("id-oro");
    expect(pistas.pendientes.size).toBe(0);
  });

  it("palabra sin numero (null): no entra al mapa ni rompe (defensivo, spec 'Palabra sin numero')", () => {
    const estado = estadoDePalabras(
      estadoPalabra("id-pato", 1),
      estadoPalabra("id-sin-numero", null),
    );
    const pistas = resolverPistas(grillaPato(), estado);

    expect(pistas.porClave.has("1:H")).toBe(true);
    // La palabra sin numero no genera clave ni pendiente:
    expect(pistas.porClave.size).toBe(1);
    expect(pistas.pendientes.size).toBe(0);
    expect(pistas.colisiones.size).toBe(0);
  });
});

describe("idsCandidatos (D2.2 — candidatos de validación por palabra)", () => {
  it("RED BUG: par colisionante sin resolver → AMBOS ids devueltos para H9 y V9 (ninguno se pierde)", () => {
    const pistas = resolverPistas(grillaConColision(), estadoParColisionante());
    const { h9, v9 } = palabrasDeParColisionante();

    const candidatosH9 = logicaC21.idsCandidatos(pistas, h9);
    const candidatosV9 = logicaC21.idsCandidatos(pistas, v9);

    // Como el armado estático no pudo resolver la colisión, el validador
    // DEBE poder probar los DOS ids — con el viejo Map<number,string> uno
    // de los dos quedaba pisado y la parte correspondiente era imposible.
    expect(new Set(candidatosH9)).toEqual(new Set(["id-h9", "id-v9"]));
    expect(new Set(candidatosV9)).toEqual(new Set(["id-h9", "id-v9"]));
  });

  it("número único → UN SOLO candidato (regresión: sin latencia extra del fix)", () => {
    const pistas = resolverPistas(
      grillaPato(),
      estadoDePalabras(estadoPalabra("id-pato", 1)),
    );
    const pato = grillaPato().palabras[0];

    expect(logicaC21.idsCandidatos(pistas, pato)).toEqual(["id-pato"]);
  });

  it("clave ya resuelta en porClave → SOLO el id de esa clave (el cache manda)", () => {
    const { h9 } = palabrasDeParColisionante();
    // Par resuelto dinámicamente: la clave "9:H" ya apunta a id-h9.
    const pistas = pistasManual();
    pistas.porClave.set("9:H", "id-h9");
    pistas.colisiones.add(9);

    expect(logicaC21.idsCandidatos(pistas, h9)).toEqual(["id-h9"]);
  });

  it("pendientes vacío para numero colisionante (inconsistencia defensiva) → [] sin excepción", () => {
    const { h9 } = palabrasDeParColisionante();
    const pistas = pistasManual();
    pistas.colisiones.add(9); // marcada, pero pendientes quedó vacío

    expect(logicaC21.idsCandidatos(pistas, h9)).toEqual([]);
  });

  it("cache PARCIAL: par resuelto en UNA clave (9:H→id-h9) → la V9 NO recibe id-h9 como candidato (ya está asignado)", () => {
    // El flujo real: el usuario valida primero la H → id-h9 queda en porClave,
    // pero la V necesita ser el OTRO id, nunca re-proponer id-h9.
    const { v9 } = palabrasDeParColisionante();
    const pistas = pistasManual();
    pistas.porClave.set("9:H", "id-h9");
    pistas.pendientes.set(9, [estadoPalabra("id-h9", 9), estadoPalabra("id-v9", 9)]);
    pistas.colisiones.add(9);

    expect(logicaC21.idsCandidatos(pistas, v9)).toEqual(["id-v9"]);
  });

  it("palabra con numero null → [] (defensivo, spec 'Palabra sin número')", () => {
    const pistas = resolverPistas(grillaPato(), estadoDePalabras());
    const sinNumero = { ...grillaPato().palabras[0], numero: null as unknown as number };

    expect(logicaC21.idsCandidatos(pistas, sinNumero)).toEqual([]);
  });
});

describe("resolverIdPorValidacion (D2.2 — decisión: qué id mandar y cuándo cachear)", () => {
  type Resultado = logicaC21.ResultadoPruebaCandidato["resultado"];

  /** Crea el probe inyectado + registro de las llamadas realizadas (fuelle
   *  para verificar "cuántas veces se llamó al backend" sin vi.mock). */
  function probarFalso(comportamiento: (id: string) => Resultado) {
    const llamadas: string[] = [];
    const probar = async (id: string): Promise<logicaC21.ResultadoPruebaCandidato> => {
      llamadas.push(id);
      return { id, resultado: comportamiento(id) };
    };
    return { probar, llamadas };
  }

  it("RED BUG: par sin resolver [v9, h9], 400→v9 y 200→h9 → adopta id-h9 y PIDE cachear (cachear=true)", async () => {
    const { probar, llamadas } = probarFalso((id) =>
      id === "id-h9" ? "acierto" : "letrasIncorrectas",
    );

    const decision = await logicaC21.resolverIdPorValidacion(
      ["id-v9", "id-h9"],
      probar,
    );

    expect(decision.tipo).toBe("acierto");
    if (decision.tipo !== "acierto") return;
    expect(decision.id).toBe("id-h9");
    // Par no resuelto antes: la resolución dinámica debe quedar cacheada.
    expect(decision.cachear).toBe(true);
    // El descarte por exclusión (id-v9) también se resuelve con el mismo viaje.
    expect(decision.descartados).toEqual(["id-v9"]);
    expect(llamadas).toEqual(["id-v9", "id-h9"]);
  });

  it("AMBOS candidatos 400 → error de letras y NO cachea (no hubo desambiguación)", async () => {
    const { probar } = probarFalso(() => "letrasIncorrectas");

    const decision = await logicaC21.resolverIdPorValidacion(
      ["id-h9", "id-v9"],
      probar,
    );

    expect(decision.tipo).toBe("letrasIncorrectas");
    expect(decision.cachear).toBe(false);
  });

  it("error no-400 (p.ej. 500/red) en el PRIMER candidato → aborta, no cachea y NO prueba al resto", async () => {
    const { probar, llamadas } = probarFalso(() => "error");

    const decision = await logicaC21.resolverIdPorValidacion(
      ["id-h9", "id-v9"],
      probar,
    );

    expect(decision.tipo).toBe("error");
    expect(decision.cachear).toBe(false);
    expect(llamadas).toEqual(["id-h9"]); // se abortó a la primera
  });

  it("caso común (número único): 1 solo candidato → 1 sola llamada + cachear=false (sin latencia extra)", async () => {
    const { probar, llamadas } = probarFalso(() => "acierto");

    const decision = await logicaC21.resolverIdPorValidacion(["id-pato"], probar);

    expect(decision.tipo).toBe("acierto");
    if (decision.tipo !== "acierto") return;
    expect(decision.id).toBe("id-pato");
    expect(decision.cachear).toBe(false); // ya estaba resuelto estáticamente
    expect(llamadas).toEqual(["id-pato"]);
  });
});

describe("explicacionDePalabra (D2.3 — explicación por palabra, no por numero)", () => {
  it("RED BUG: par colisionante SIN resolver → H9 y V9 muestran TEXTOS DISTINTOS (uno por id), nunca el mismo texto duplicado", () => {
    const pistas = resolverPistas(grillaConColision(), estadoParColisionante());
    const { h9, v9 } = palabrasDeParColisionante();
    const partida = partidaConPar();

    const textoH = logicaC21.explicacionDePalabra(pistas, partida, h9);
    const textoV = logicaC21.explicacionDePalabra(pistas, partida, v9);

    // Bug original: el mapa numero->id pisaba un id y AMBAS pistas mostraban
    // la misma explicacion (QKL3K7). Ahora cada una DEBE venir de su id.
    expect(textoH).not.toBeNull();
    expect(textoV).not.toBeNull();
    // Necesitamos distinguir H de V incluso con el par pendiente:
    expect(textoH === textoV).toBe(false);
    expect(textoH).toContain("HORIZONTAL");
    expect(textoV).toContain("vertical");
  });

  it("número único → id seguro y explicación correcta (regresión: caso más común)", () => {
    const pistas = resolverPistas(
      grillaPato(),
      estadoDePalabras(estadoPalabra("id-pato", 1)),
    );
    const pato = grillaPato().palabras[0];
    const partida = { palabras: [{ id: "id-pato", explicacion: "Animal de granja" }] };

    expect(logicaC21.explicacionDePalabra(pistas, partida, pato)).toBe(
      "Animal de granja",
    );
  });

  it("par resuelto (porClave con las 2 claves) → cada palabra muestra SU explicación", () => {
    const { h9, v9 } = palabrasDeParColisionante();
    const pistas = pistasManual();
    pistas.porClave.set("9:H", "id-h9");
    pistas.porClave.set("9:V", "id-v9");

    expect(logicaC21.explicacionDePalabra(pistas, partidaConPar(), h9)).toContain(
      "HORIZONTAL",
    );
    expect(logicaC21.explicacionDePalabra(pistas, partidaConPar(), v9)).toContain(
      "vertical",
    );
  });

  it("sin partida (null) → null (sin texto de pista disponible)", () => {
    const pistas = resolverPistas(grillaPato(), estadoDePalabras());
    const pato = grillaPato().palabras[0];

    expect(logicaC21.explicacionDePalabra(pistas, null, pato)).toBeNull();
  });
});

/**
 * ESCENARIO QKL3K7 DEL PO (c-21, task 6.1): integración de TODO el flujo con
 * un crucigrama de 2 inicios en la misma celda (H9+V9, mismo numero).
 *
 * Encadena las piezas puras exactamente como las consume el front:
 *   1. armado estático (resolverPistas)         → 2 candidatos para el par
 *   2. panel (explicacionDePalabra por palabra) → textos DISTINTOS
 *   3. validar H (resolverIdPorValidacion)      → rescata SU id y cachea
 *   4. cache aplicado en porClave               → H9 y V9 quedan resueltas
 *   5. validar V tras el cache                  → 1 sola llamada, SU id
 *   6. contador (idsEncontrados)                → 2/2 al completar ambas
 */
describe("escenario PO QKL3K7 (c-21)", () => {
  /** Simula el probe del hook: responde a la API por id, con contador de
   *  llamadas para verificar que el par cacheado NO re-prueba. */
  function probarBackend(respuestas: Map<string, "acierto" | "letrasIncorrectas">) {
    const llamadas: string[] = [];
    const probar = (id: string): Promise<logicaC21.ResultadoPruebaCandidato> => {
      llamadas.push(id);
      return Promise.resolve({
        id,
        resultado: respuestas.get(id) ?? "letrasIncorrectas",
      });
    };
    return { probar, llamadas };
  }

  /** Aplica la decisión al cache EXACTAMENTE como el hook (clave propia +
   *  clave de la hermana por exclusión de orientacion). */
  function cachear(
    porClave: Map<logicaC21.ClavePista, string>,
    palabra: PalabraGrilla,
    decision: { id: string; descartados: string[] },
    grilla: GrillaCrucigrama,
  ): void {
    porClave.set(clavePista(palabra.numero, palabra.orientacion), decision.id);
    for (const id of decision.descartados) {
      const hermana = grilla.palabras.find(
        (w) =>
          w.numero === palabra.numero &&
          w.orientacion !== palabra.orientacion &&
          !porClave.has(clavePista(w.numero, w.orientacion)),
      );
      if (hermana) porClave.set(clavePista(hermana.numero, hermana.orientacion), id);
    }
  }

  it("(a+b+c+d) panel con textos distintos → H valida SU id → cache resuelve V → 2/2 encontradas", async () => {
    const grilla = grillaConColision();
    const { h9, v9 } = palabrasDeParColisionante();
    const partida = partidaConPar();

    // 1. ARMADO ESTÁTICO: el par queda pendiente y marcado como colisión.
    //    (el estado del fixture solo trae las 2 del par 9: porClave queda vacío)
    const pistas = resolverPistas(grilla, estadoParColisionante());
    expect(pistas.porClave.size).toBe(0);
    expect(pistas.colisiones.has(9)).toBe(true);
    expect(idsCandidatos(pistas, h9)).toEqual(["id-h9", "id-v9"]);
    expect(idsCandidatos(pistas, v9)).toEqual(["id-h9", "id-v9"]);

    // 2. PANEL: las DOS pistas del numero 9 muestran textos distintos (el
    //    bug viejo pisaba una con Map<number,string>).
    const textoH = logicaC21.explicacionDePalabra(pistas, partida, h9);
    const textoV = logicaC21.explicacionDePalabra(pistas, partida, v9);
    expect(textoH?.toLowerCase()).toContain("horizontal");
    expect(textoV?.toLowerCase()).toContain("vertical");
    expect(textoH).not.toBe(textoV);

    // 3. VALIDAR H: el par está pendiente, se prueban los candidatos en el
    //    orden de `idsCandidatos` ([id-h9, id-v9]): id-h9 responde 200
    //    (acierto) → adopta id-h9 y PIDE cachear (par: había >1 candidato).
    //    id-v9 queda SIN probar: el cache parcial del paso 4 lo descarta solo.
    const respuestas = new Map([["id-h9", "acierto" as const]]);
    const { probar, llamadas } = probarBackend(respuestas);
    const decision = await resolverIdPorValidacion(idsCandidatos(pistas, h9), probar);
    expect(decision).toEqual({
      tipo: "acierto",
      id: "id-h9",
      cachear: true,
      descartados: [],
    });
    expect(llamadas).toEqual(["id-h9"]); // 1 sola llamada: sin latencia extra
    // H sigue activa: no se cachea NADA hasta que la validación confirma.
    expect(pistas.colisiones.has(9)).toBe(true);
    if (decision.tipo !== "acierto") return;

    // 4. CACHE PARCIAL: el hook aplica la decisión sobre porClave (clave
    //    propia). id-v9 queda en pendientes pero `idsCandidatos` lo EXCLUYE
    //    (id-h9 ya está asignado bajo 9:H): la V9 queda con 1 solo candidato.
    cachear(pistas.porClave, h9, decision, grilla);
    expect(idsCandidatos(pistas, h9)).toEqual(["id-h9"]);
    expect(idsCandidatos(pistas, v9)).toEqual(["id-v9"]);

    // 5. VALIDAR V tras el cache: queda UN candidato → UNA sola llamada
    //    (sin reintentos ni latencia extra) y adopta SU id.
    const respuestasV = new Map([["id-v9", "acierto" as const]]);
    const v = probarBackend(respuestasV);
    const decisionV = await resolverIdPorValidacion(idsCandidatos(pistas, v9), v.probar);
    expect(decisionV).toEqual({ tipo: "acierto", id: "id-v9", cachear: false, descartados: [] });
    expect(v.llamadas).toEqual(["id-v9"]);

    // 6. CONTADOR: el backend marca ambas encontradas (C-14) → 2 ids
    //    → el progreso llega al total (2/2) con las DOS del par.
    const encontradas = idsEncontrados([
      { id: "id-h9", encontrada: true },
      { id: "id-v9", encontrada: true },
    ]);
    expect(encontradas).toEqual(new Set(["id-h9", "id-v9"]));
    expect(encontradas.size).toBe(2);
  });
});