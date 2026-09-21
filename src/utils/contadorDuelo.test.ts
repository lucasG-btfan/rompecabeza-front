import { describe, expect, test } from "vitest";
import { contadorAcotado, textoMarcadorDuelo } from "./contadorDuelo";

// Contador visible del duelo 1v1 (AMEND CAMBIO 2): "[jugador1] n/m
// [jugador2] n/m". Lógica PURA separada en util (patrón resultadoDuelo.ts);
// el componente MarcadorDuelo solo pinta el texto.

describe("textoMarcadorDuelo", () => {
  test("duelo emparejado: ambos jugadores con nombre y contador", () => {
    expect(
      textoMarcadorDuelo(
        { nombre: "lucasss", contador: 7 },
        { nombre: "maria_88", contador: 5 },
        12,
      ),
    ).toBe("[lucasss] 7/12 [maria_88] 5/12");
  });

  test("rival todavía desconocido (esperando) → placeholder 'rival'", () => {
    expect(
      textoMarcadorDuelo(
        { nombre: "lucasss", contador: 0 },
        { nombre: null, contador: 0 },
        12,
      ),
    ).toBe("[lucasss] 0/12 [rival] 0/12");
  });

  test("contador que excede el total (glitch del corte) → acotado a m/m", () => {
    expect(
      textoMarcadorDuelo(
        { nombre: "lucasss", contador: 13 },
        { nombre: "maria_88", contador: 12 },
        12,
      ),
    ).toBe("[lucasss] 12/12 [maria_88] 12/12");
  });

  test("nombres con acentos y eñe (unicode)", () => {
    expect(
      textoMarcadorDuelo(
        { nombre: "Juán_Muñóz", contador: 2 },
        { nombre: "lucasss", contador: 1 },
        4,
      ),
    ).toBe("[Juán_Muñóz] 2/4 [lucasss] 1/4");
  });
});

describe("contadorAcotado", () => {
  test("valores normales pasan igual", () => {
    expect(contadorAcotado(3, 12)).toBe(3);
  });

  test("contador negativo → 0 (nunca número negativo en pantalla)", () => {
    expect(contadorAcotado(-2, 12)).toBe(0);
  });

  test("contador que supera el total → el total (m/m, posible en la carrera del corte)", () => {
    expect(contadorAcotado(20, 12)).toBe(12);
  });
});