/**
 * Tests de la lógica pura de progreso de partida compartida (C-14, D10).
 *
 * `idsEncontrados` arma el estado de "palabras encontradas" de la SESIÓN en
 * memoria: con el progreso efímero (C-14) ya no existe persistencia por jugador
 * (ni backend ni localStorage), así que la única fuente de verdad es el
 * `estado.palabras` que trae el GET /estado. Pura, determinista y sin side
 * effects — se testea directo con vitest.
 */

import { describe, expect, it } from "vitest";
import { idsEncontrados } from "./progreso";

describe("idsEncontrados", () => {
  it("devuelve un Set vacío con lista vacía", () => {
    const ids = idsEncontrados([]);
    expect(ids.size).toBe(0);
  });

  it("solo incluye los ids con encontrada: true (mezcla de encontradas y no)", () => {
    const ids = idsEncontrados([
      { id: "a", encontrada: true },
      { id: "b", encontrada: false },
      { id: "c", encontrada: true },
      { id: "d", encontrada: false },
    ]);
    expect(ids.has("a")).toBe(true);
    expect(ids.has("b")).toBe(false);
    expect(ids.has("c")).toBe(true);
    expect(ids.has("d")).toBe(false);
    expect(ids.size).toBe(2);
  });

  it("no duplica ids repetidos en la lista", () => {
    const ids = idsEncontrados([
      { id: "x", encontrada: true },
      { id: "x", encontrada: true },
      { id: "y", encontrada: true },
    ]);
    expect(ids.size).toBe(2);
    expect(ids.has("x")).toBe(true);
    expect(ids.has("y")).toBe(true);
  });
});