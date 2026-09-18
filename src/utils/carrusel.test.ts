import { describe, expect, test } from "vitest";
import { siguienteIndice, anteriorIndice } from "./carrusel";

// Lógica pura del carrusel del lobby (C-17, D11): navegación circular de
// tarjetas. Invariante: `total <= 1` → siempre 0 (no hay nada que navegar).

describe("siguienteIndice", () => {
  test("total 0 → siempre 0 (sin partidas)", () => {
    expect(siguienteIndice(0, 0)).toBe(0);
  });

  test("total 1 → siempre 0 (una sola tarjeta)", () => {
    expect(siguienteIndice(0, 1)).toBe(0);
  });

  test("total 2 → alterna 0 ↔ 1", () => {
    expect(siguienteIndice(0, 2)).toBe(1);
    expect(siguienteIndice(1, 2)).toBe(0);
  });

  test("total 5 → wrap-around al llegar al final", () => {
    expect(siguienteIndice(0, 5)).toBe(1);
    expect(siguienteIndice(3, 5)).toBe(4);
    expect(siguienteIndice(4, 5)).toBe(0);
  });
});

describe("anteriorIndice", () => {
  test("total 0 → siempre 0 (sin partidas)", () => {
    expect(anteriorIndice(0, 0)).toBe(0);
  });

  test("total 1 → siempre 0 (una sola tarjeta)", () => {
    expect(anteriorIndice(0, 1)).toBe(0);
  });

  test("total 2 → alterna 0 ↔ 1 en sentido inverso", () => {
    expect(anteriorIndice(0, 2)).toBe(1);
    expect(anteriorIndice(1, 2)).toBe(0);
  });

  test("total 5 → wrap-around al volver desde el inicio", () => {
    expect(anteriorIndice(0, 5)).toBe(4);
    expect(anteriorIndice(4, 5)).toBe(3);
    expect(anteriorIndice(2, 5)).toBe(1);
  });
});