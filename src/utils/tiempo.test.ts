import { describe, expect, it } from "vitest";
import { formatearTiempo, segundosTranscurridos } from "./tiempo";

describe("formatearTiempo", () => {
  it("formatea cero como 00:00", () => {
    expect(formatearTiempo(0)).toBe("00:00");
  });

  it("formatea segundos sueltos con pad de dos dígitos", () => {
    expect(formatearTiempo(5)).toBe("00:05");
    expect(formatearTiempo(42)).toBe("00:42");
  });

  it("formatea 65 segundos como 01:05", () => {
    expect(formatearTiempo(65)).toBe("01:05");
  });

  it("formatea minutos con más de una cifra", () => {
    expect(formatearTiempo(600)).toBe("10:00");
    expect(formatearTiempo(3661)).toBe("61:01");
  });

  it("redondea hacia abajo (piso) los segundos fraccionarios", () => {
    expect(formatearTiempo(65.9)).toBe("01:05");
  });

  it("devuelve em dash para null", () => {
    expect(formatearTiempo(null)).toBe("—");
  });

  it("devuelve em dash para undefined", () => {
    expect(formatearTiempo(undefined)).toBe("—");
  });
});

describe("segundosTranscurridos (C-12, D2 — cronómetro)", () => {
  it("calcula los segundos completos entre dos epochs", () => {
    expect(segundosTranscurridos(1000, 66_000)).toBe(65);
  });

  it("redondea hacia abajo los segundos parciales (piso)", () => {
    expect(segundosTranscurridos(0, 1_999)).toBe(1);
  });

  it("clampa a 0 cuando `desde` es futuro (clock skew defensivo)", () => {
    expect(segundosTranscurridos(5_000, 3_000)).toBe(0);
  });
});