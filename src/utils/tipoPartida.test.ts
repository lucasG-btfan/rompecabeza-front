import { describe, expect, test } from "vitest";
import { etiquetaTipo } from "./tipoPartida";

describe("etiquetaTipo", () => {
  test("tipo 'sopa' → 'Sopa de letras'", () => {
    expect(etiquetaTipo("sopa")).toBe("Sopa de letras");
  });

  test("tipo 'crucigrama' → 'Crucigrama'", () => {
    expect(etiquetaTipo("crucigrama")).toBe("Crucigrama");
  });
});