import { describe, expect, test } from "vitest";
import { etiquetaTipo } from "./tipoPartida";

// Etiqueta legible del tipo de partida para el lobby (C-17, D12): la tarjeta
// del carrusel debe mostrar "Sopa de letras" o "Crucigrama" según `partida.tipo`.

describe("etiquetaTipo", () => {
  test("tipo 'sopa' → 'Sopa de letras'", () => {
    expect(etiquetaTipo("sopa")).toBe("Sopa de letras");
  });

  test("tipo 'crucigrama' → 'Crucigrama'", () => {
    expect(etiquetaTipo("crucigrama")).toBe("Crucigrama");
  });
});