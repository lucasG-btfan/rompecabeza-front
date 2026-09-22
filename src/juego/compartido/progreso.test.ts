
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