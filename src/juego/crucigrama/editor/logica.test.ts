
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
    const result = validarPreview([colocada("CASA", 0, 0, "H")], "SOL", 5, 5, "V");
    expect(result.valido).toBe(true);
    expect(result.conflictos).toEqual([]);
  });
});

describe("anclarPalabra — snap al cruce más cercano + colocación libre (opción C)", () => {
  it("devuelve el ancla del cruce válido que cubre la celda de drop", () => {
    const colocadas = [colocada("CASA", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "SOL", 0, 2, "V");
    expect(ancla).toEqual({ fila: 0, columna: 2 });
  });

  it("elige la ancla positiva más cercana cuando no hay negativas involucradas", () => {
    const colocadas = [colocada("ESPEJO", 2, 0, "H")];
    const ancla = anclarPalabra(colocadas, "ARENA", 2, 0, "V");
    expect(ancla).toEqual({ fila: 0, columna: 0 });
  });

  it("acepta anclas con fila negativa (REVISIÓN 9.x, D1)", () => {
    const colocadas = [colocada("CASA", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "OSO", 0, 2, "V");
    expect(ancla).toEqual({ fila: -1, columna: 2 });
  });

  it("acepta anclas con columna negativa en horizontal (REVISIÓN 9.x, D1)", () => {
    const colocadas = [colocada("SOL", 0, 0, "V")];
    const ancla = anclarPalabra(colocadas, "CASA", 0, 0, "H");
    expect(ancla).toEqual({ fila: 0, columna: -2 });
  });

  it("revierte el bug del PO: ESPEJO (0,0) + ARENA V ancla en (-2,0)", () => {
    const colocadas = [colocada("ESPEJO", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "ARENA", 0, 0, "V");
    expect(ancla).toEqual({ fila: -2, columna: 0 });
  });

  it("snap elige el cruce válido MÁS CERCANO al puntero entre varios", () => {
    const colocadas = [colocada("CASA", 0, 0, "H"), colocada("PERRO", 10, 0, "H")];
    expect(anclarPalabra(colocadas, "SOL", 0, 1, "V")).toEqual({ fila: 0, columna: 2 });
    expect(anclarPalabra(colocadas, "SOL", 10, 3, "V")).toEqual({ fila: 9, columna: 4 });
  });

  it("colocación libre sin cruces: primera letra en la celda de drop", () => {
    const colocadas = [colocada("CASA", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "XYZ", 9, 9, "V");
    expect(ancla).toEqual({ fila: 9, columna: 9 });
  });

  it("bloquea el drop cuando la colocación libre choca (paralela)", () => {
    const colocadas = [colocada("CASA", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "SOL", 0, 1, "H");
    expect(ancla).toBeNull();
  });

  it("bloquea el drop cuando la colocación libre genera fantasma", () => {
    const colocadas = [colocada("CASA", 0, 0, "H")];
    const ancla = anclarPalabra(colocadas, "XYZ", 1, 0, "V");
    expect(ancla).toBeNull();
  });

  it("busca anclas en TODA la grilla (no solo en la celda de drop)", () => {
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
    expect(numeros.get("0,0")).toBe(1); 
    expect(numeros.get("0,2")).toBe(2); 
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