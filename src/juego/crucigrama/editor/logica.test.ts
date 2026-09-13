/**
 * Tests de la lógica pura del editor de crucigrama (C-09).
 *
 * `logica.ts` es el espejo deliberado (D7 REVISADO post-QA) de la validación
 * del servidor (`crucigrama_generator.py` + `crucigrama_editor.py`): mismas
 * reglas de cruce con letra coincidente y anti-fantasma (SIN conectividad
 * obligatoria — opción C, D4 REVISADO). Estos tests replican 1:1 los
 * escenarios de `back/tests/test_crucigrama_editor.py` para que el drift
 * cliente/servidor quede cubierto por ambos lados.
 *
 * REVISIÓN 9.x: se invirtieron los casos de conectividad (la palabra posterior
 * sin cruce es válida), los tres casos de coordenadas negativas ahora esperan
 * el ancla negativa correcta (el PUT las acepta, D1 REVISADO), y se agregaron
 * los casos de la opción C: snap al cruce más cercano, colocación libre sin
 * cruce y drop bloqueado cuando la libre choca.
 */

import { describe, expect, it } from "vitest";

import {
  anclarPalabra,
  botonFinalizarAuto,
  celdasDePalabra,
  colocadasValidas,
  type Colocada,
  normalizarGrilla,
  numerosDePista,
  validarPreview,
} from "./logica";

function colocada(
  palabra: string,
  fila: number,
  columna: number,
  orientacion: "H" | "V",
): Colocada {
  return {
    palabra,
    posicion: { fila, columna },
    orientacion,
  };
}

describe("celdasDePalabra", () => {
  it("calcula las celdas de una palabra horizontal", () => {
    const celdas = celdasDePalabra("CASA", 0, 0, "H");
    expect(celdas).toEqual([
      { fila: 0, columna: 0, letra: "C" },
      { fila: 0, columna: 1, letra: "A" },
      { fila: 0, columna: 2, letra: "S" },
      { fila: 0, columna: 3, letra: "A" },
    ]);
  });

  it("calcula las celdas de una palabra vertical", () => {
    const celdas = celdasDePalabra("SOL", 1, 2, "V");
    expect(celdas).toEqual([
      { fila: 1, columna: 2, letra: "S" },
      { fila: 2, columna: 2, letra: "O" },
      { fila: 3, columna: 2, letra: "L" },
    ]);
  });
});

describe("colocadasValidas", () => {
  it("mapea celda -> letra de todas las ya posicionadas", () => {
    const mapa = colocadasValidas([
      colocada("CASA", 0, 0, "H"),
      colocada("SOL", 0, 2, "V"),
    ]);
    expect(mapa.get("0,2")).toBe("S"); // CASA y SOL comparten la S
    expect(mapa.get("1,2")).toBe("O");
    expect(mapa.get("0,0")).toBe("C");
    expect(mapa.size).toBe(6); // 4 + 3 - 1 compartida
  });
});

describe("validarPreview — espejo de validar_posicion del servidor", () => {
  it("cruce válido H sobre V con letra coincidente -> valido sin conflictos", () => {
    const result = validarPreview([colocada("SOL", 0, 2, "V")], "CASA", 0, 0, "H");
    expect(result.valido).toBe(true);
    expect(result.conflictos).toEqual([]);
  });

  it("cruce perpendicular legítimo NO marcado como fantasma", () => {
    const result = validarPreview([colocada("CASA", 0, 0, "H")], "SOL", 0, 2, "V");
    expect(result.valido).toBe(true);
  });

  it("cruce con letra distinta -> conflicto 'no coincide' en la celda", () => {
    const result = validarPreview([colocada("CASA", 0, 0, "H")], "SOL", 0, 1, "V");
    expect(result.valido).toBe(false);
    expect(result.conflictos).toContainEqual(
      expect.objectContaining({ fila: 0, columna: 1, motivo: expect.stringContaining("no coincide") }),
    );
  });

  it("solapamiento paralelo -> conflicto 'paralela'", () => {
    const result = validarPreview([colocada("CASA", 0, 0, "H")], "SOL", 0, 0, "H");
    expect(result.valido).toBe(false);
    expect(result.conflictos[0]?.motivo).toContain("paralela");
  });

  it("palabra fantasma paralela-adyacente -> conflicto 'fantasma'", () => {
    const result = validarPreview(
      [colocada("CARTA", 0, 0, "H"), colocada("ALTO", 0, 1, "V")],
      "PLATO",
      1,
      0,
      "H",
    );
    expect(result.valido).toBe(false);
    expect(result.conflictos.some((c) => c.motivo.toLowerCase().includes("fantasma"))).toBe(true);
  });

  it("primera palabra flota sin cruces (colocadas vacías) -> valido", () => {
    const result = validarPreview([], "CASA", 4, 7, "H");
    expect(result.valido).toBe(true);
  });

  it("palabra posterior sin cruce -> válida (opción C: colocación libre)", () => {
    // REVISIÓN 9.x (D4): sin conectividad obligatoria, una palabra puede
    // quedar como componente separado y el orden de inserción es irrelevante.
    const result = validarPreview([colocada("CASA", 0, 0, "H")], "SOL", 5, 5, "V");
    expect(result.valido).toBe(true);
    expect(result.conflictos).toEqual([]);
  });
});

describe("anclarPalabra — snap al cruce más cercano + colocación libre (opción C)", () => {
  it("devuelve el ancla del cruce válido que cubre la celda de drop", () => {
    // CASA H (0,0) ocupa la S en (0,2). Soltar SOL V sobre (0,2): la S de SOL
    // (offset 0) coincide en (0,2) -> ancla (0,2) (distancia 0 al puntero).
    const colocadas = [colocada("CASA", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "SOL", 0, 2, "V");
    expect(ancla).toEqual({ fila: 0, columna: 2 });
  });

  it("elige la ancla positiva más cercana cuando no hay negativas involucradas", () => {
    // ESPEJO H en (2,0) (primera palabra en fila positiva). ARENA V soltada
    // en (2,0): la E de ARENA (offset 2) coincide con las E de ESPEJO en
    // (2,0) y (2,3) -> anclas (0,0) y (0,3); la más cercana al puntero (2,0)
    // es (0,0) (distancia 2 vs 5).
    const colocadas = [colocada("ESPEJO", 2, 0, "H")];
    const ancla = anclarPalabra(colocadas, "ARENA", 2, 0, "V");
    expect(ancla).toEqual({ fila: 0, columna: 0 });
  });

  it("acepta anclas con fila negativa (REVISIÓN 9.x, D1)", () => {
    // OSO V sobre la S de CASA (0,2): la única coincidencia (la S del medio)
    // exige anclar en (-1,2). Antes de la revisión el snap descartaba la ancla
    // (el PUT rechazaba negativos con 422); ahora el PUT los acepta.
    const colocadas = [colocada("CASA", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "OSO", 0, 2, "V");
    expect(ancla).toEqual({ fila: -1, columna: 2 });
  });

  it("acepta anclas con columna negativa en horizontal (REVISIÓN 9.x, D1)", () => {
    // SOL V en (0,0) ocupa la S en (0,0). Soltar CASA H sobre (0,0): la S de
    // CASA (offset 2) coincide con la S de SOL -> ancla (0,-2), columna
    // negativa aceptada (la primera palabra CASA NO es viable: cae en (0,0),
    // que es lo que exigía el bug del PO). Antes de la revisión el snap
    // descartaba la ancla por negativa (drop bloqueado) y el PUT la rechazaba.
    const colocadas = [colocada("SOL", 0, 0, "V")];
    const ancla = anclarPalabra(colocadas, "CASA", 0, 0, "H");
    expect(ancla).toEqual({ fila: 0, columna: -2 });
  });

  it("revierte el bug del PO: ESPEJO (0,0) + ARENA V ancla en (-2,0)", () => {
    // ESPEJO H en (0,0) — la primera palabra SIEMPRE cae en (0,0). La E de
    // ARENA (offset 2) coincide con la E de ESPEJO en (0,0) y en (0,3): hay
    // dos anclas (-2,0) y (-2,3). Soltando sobre (0,0) gana la más cercana:
    // (-2,0). Antes de la revisión el snap devolvía null (drop bloqueado en el
    // bug reportado por el usuario: Ø a pesar de compartir letras).
    const colocadas = [colocada("ESPEJO", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "ARENA", 0, 0, "V");
    expect(ancla).toEqual({ fila: -2, columna: 0 });
  });

  it("snap elige el cruce válido MÁS CERCANO al puntero entre varios", () => {
    // CASA H (0,0) y PERRO H (10,0). SOL V solo puede cruzarlas en (0,2) [S]
    // o en (9,4) [la O de PERRO con la O de SOL en offset 1]. Soltar cerca de
    // cada una debe snapear al cruce correspondiente.
    const colocadas = [colocada("CASA", 0, 0, "H"), colocada("PERRO", 10, 0, "H")];
    expect(anclarPalabra(colocadas, "SOL", 0, 1, "V")).toEqual({ fila: 0, columna: 2 });
    expect(anclarPalabra(colocadas, "SOL", 10, 3, "V")).toEqual({ fila: 9, columna: 4 });
  });

  it("colocación libre sin cruces: primera letra en la celda de drop", () => {
    // XYZ no comparte ninguna letra con CASA -> sin anclas de cruce. El
    // fallback (opción C) coloca la palabra con su primera letra en el drop.
    const colocadas = [colocada("CASA", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "XYZ", 9, 9, "V");
    expect(ancla).toEqual({ fila: 9, columna: 9 });
  });

  it("bloquea el drop cuando la colocación libre choca (paralela)", () => {
    // SOL H soltada sobre CASA H: sin palabras perpendiculares no hay anclas
    // de cruce, y la colocación libre en (0,1) se superpone en paralelo ->
    // null (drop bloqueado).
    const colocadas = [colocada("CASA", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "SOL", 0, 1, "H");
    expect(ancla).toBeNull();
  });

  it("bloquea el drop cuando la colocación libre genera fantasma", () => {
    // XYZ soltada V en (1,0): celda libre pero se pega en línea a la C de
    // CASA (0,0) -> palabra fantasma -> null (drop bloqueado).
    const colocadas = [colocada("CASA", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "XYZ", 1, 0, "V");
    expect(ancla).toBeNull();
  });

  it("busca anclas en TODA la grilla (no solo en la celda de drop)", () => {
    // Soltar SOL V sobre la A de CASA (0,1): ninguna letra de SOL coincide
    // con la 'A' en esa columna, pero la S de SOL coincide con la S de CASA
    // en (0,2) -> snap a (0,2), no null (el snap ya no exige cubrir la celda).
    const colocadas = [colocada("CASA", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "SOL", 0, 1, "V");
    expect(ancla).toEqual({ fila: 0, columna: 2 });
  });
});

describe("normalizarGrilla", () => {
  it("calcula el bounding box mínimo con el offset de traslación", () => {
    const colocadas = [
      colocada("CASA", 1, 1, "H"),
      colocada("SOL", 1, 3, "V"),
    ];
    const bbox = normalizarGrilla(colocadas);
    expect(bbox).toEqual({ minFila: 1, minCol: 1, filas: 3, columnas: 4 });
  });

  it("devuelve null sin palabras posicionadas", () => {
    expect(normalizarGrilla([])).toBeNull();
  });
});

describe("numerosDePista", () => {
  it("numera 1..N en barrido fila-major igual que numerar_pistas del servidor", () => {
    const colocadas = [
      colocada("CASA", 1, 1, "H"),
      colocada("SOL", 1, 3, "V"),
    ];
    const numeros = numerosDePista(colocadas);
    expect(numeros.get("0,0")).toBe(1); // CASA normalizada a (0,0)
    expect(numeros.get("0,2")).toBe(2); // SOL normalizada a (0,2)
    expect(numeros.size).toBe(2);
  });
});

describe("botonFinalizarAuto — camino automático del backend (C-11, defecto QA)", () => {
  it("devuelve true con CERO palabras posicionadas y total > 0 (el backend genera la grilla)", () => {
    expect(botonFinalizarAuto(0, 8)).toBe(true);
  });

  it("devuelve false cuando TODAS están posicionadas (layout manual)", () => {
    expect(botonFinalizarAuto(8, 8)).toBe(false);
  });

  it("devuelve false con posiciones parciales (el backend rechaza la mezcla con 400)", () => {
    expect(botonFinalizarAuto(3, 8)).toBe(false);
  });

  it("devuelve false sin palabras para finalizar (total === 0, defensivo)", () => {
    expect(botonFinalizarAuto(0, 0)).toBe(false);
  });
});