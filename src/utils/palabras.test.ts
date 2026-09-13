import { describe, expect, it } from "vitest";
import { parsearPalabras } from "./palabras";

describe("parsearPalabras", () => {
  it("separa por comas devolviendo PalabraInput sin explicación", () => {
    const resultado = parsearPalabras("CASA, PERRO, SOL");
    expect(resultado).toEqual([
      { palabra: "CASA" },
      { palabra: "PERRO" },
      { palabra: "SOL" },
    ]);
  });

  it("separa por saltos de línea (o mezcla de separadores)", () => {
    const resultado = parsearPalabras("CASA, PERRO\nSOL");
    expect(resultado).toEqual([
      { palabra: "CASA" },
      { palabra: "PERRO" },
      { palabra: "SOL" },
    ]);
  });

  it("interpreta 'PALABRA: pista' como palabra con explicación", () => {
    const resultado = parsearPalabras("CASA: donde vivís");
    expect(resultado).toEqual([{ palabra: "CASA", explicacion: "donde vivís" }]);
  });

  it("acepta '—' (em dash) como separador palabra/pista", () => {
    const resultado = parsearPalabras("PERRO — el mejor amigo");
    expect(resultado).toEqual([{ palabra: "PERRO", explicacion: "el mejor amigo" }]);
  });

  it("acepta '|' como separador palabra/pista", () => {
    const resultado = parsearPalabras("SOL | estrella del sistema");
    expect(resultado).toEqual([{ palabra: "SOL", explicacion: "estrella del sistema" }]);
  });

  it("combina múltiples palabras con pistas y sin pistas", () => {
    const resultado = parsearPalabras("CASA: donde vivís, PERRO — el mejor amigo\nSOL");
    expect(resultado).toEqual([
      { palabra: "CASA", explicacion: "donde vivís" },
      { palabra: "PERRO", explicacion: "el mejor amigo" },
      { palabra: "SOL" },
    ]);
  });

  it("NO usa el guión simple como separador (CO-AUTOR sigue siendo una palabra)", () => {
    const resultado = parsearPalabras("CO-AUTOR");
    expect(resultado).toEqual([{ palabra: "CO-AUTOR" }]);
  });

  it("recorta espacios alrededor de palabra y pista", () => {
    const resultado = parsearPalabras("  CASA  :   la casa   ");
    expect(resultado).toEqual([{ palabra: "CASA", explicacion: "la casa" }]);
  });

  it("descarta tokens vacíos", () => {
    const resultado = parsearPalabras("CASA,, ,PERRO");
    expect(resultado).toEqual([{ palabra: "CASA" }, { palabra: "PERRO" }]);
  });

  it("descarta tokens que solo tienen pista (sin palabra antes del separador)", () => {
    const resultado = parsearPalabras(": pista solitaria, CASA: ok");
    expect(resultado).toEqual([{ palabra: "CASA", explicacion: "ok" }]);
  });

  it("no manda explicación cuando la pista queda vacía (CASA:) — la key no viaja", () => {
    const resultado = parsearPalabras("CASA:");
    expect("explicacion" in resultado[0]).toBe(false);
  });

  it("usa el PRIMER separador encontrado y conserva el resto en la pista", () => {
    const resultado = parsearPalabras("HORA: el reloj: de pulsera");
    expect(resultado).toEqual([{ palabra: "HORA", explicacion: "el reloj: de pulsera" }]);
  });

  it("devuelve lista vacía para entrada vacía", () => {
    expect(parsearPalabras("")).toEqual([]);
    expect(parsearPalabras("  , ,\n  ")).toEqual([]);
  });
});