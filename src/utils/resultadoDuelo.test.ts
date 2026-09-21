import { describe, expect, test } from "vitest";
import { subtituloResultado, tituloResultado } from "./resultadoDuelo";
import type { ResultadoDuelo } from "../types/partidas";

// Lógica pura del copy de la pantalla de resultado del duelo 1v1 (C-19, D11):
// gane true → festivo 🥳🎉, gane false → sobrio, gane null (empate) → neutral.
// El copy exacto vive en el design.md (D11/D13): NO cambiar sin cambiar el design.

function resultado(gane: boolean | null, rival = "lucasss"): ResultadoDuelo {
  return {
    yo_palabras: 7,
    rival_palabras: 5,
    gane,
    rival,
    tiempo_total_seg: 342,
  };
}

describe("tituloResultado", () => {
  test("gané → festivo con emojis", () => {
    expect(tituloResultado(resultado(true))).toBe("¡Ganaste el duelo! 🥳🎉");
  });

  test("perdí → sobrio, sin emojis", () => {
    expect(tituloResultado(resultado(false))).toBe("Perdiste el duelo");
  });

  test("empate → neutral", () => {
    expect(tituloResultado(resultado(null))).toBe("Empate");
  });
});

describe("subtituloResultado", () => {
  test("gané → festivo mencionando al rival", () => {
    expect(subtituloResultado(resultado(true), "maria_88")).toBe(
      "Encontraste más palabras que maria_88. ¡No para cualquiera!",
    );
  });

  test("perdí → sobrio mencionando al rival", () => {
    expect(subtituloResultado(resultado(false), "maria_88")).toBe(
      "maria_88 encontró más palabras que vos. La revancha es otra partida.",
    );
  });

  test("empate → neutral (sin rival en el copy)", () => {
    expect(subtituloResultado(resultado(null), "maria_88")).toBe(
      "¡Qué parejo! Igual cantidad de palabras.",
    );
  });

  test("rival de un solo caracter (edge case)", () => {
    expect(subtituloResultado(resultado(false), "a")).toBe(
      "a encontró más palabras que vos. La revancha es otra partida.",
    );
  });

  test("rival con acentos y eñe (unicode)", () => {
    expect(subtituloResultado(resultado(true), "Juán_Muñóz")).toBe(
      "Encontraste más palabras que Juán_Muñóz. ¡No para cualquiera!",
    );
  });
});