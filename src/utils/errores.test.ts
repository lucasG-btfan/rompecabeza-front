import { describe, expect, it } from "vitest";
import { mensajeError } from "./errores";

describe("mensajeError", () => {
  it("traduce 404 al copy de partida inexistente", () => {
    expect(mensajeError({ status: 404, message: "Partida no encontrada" })).toBe(
      "La partida no existe o el código es incorrecto",
    );
  });

  it("traduce 500 al copy de error de servidor", () => {
    expect(mensajeError({ status: 500, message: "Internal Server Error" })).toBe(
      "Hubo un problema en el servidor, probá de nuevo",
    );
  });

  it("para 400 devuelve el detail del backend", () => {
    expect(mensajeError({ status: 400, message: "Esta partida todavía no está activa." })).toBe(
      "Esta partida todavía no está activa.",
    );
  });

  it("para otros status (403/422) devuelve el detail del backend", () => {
    expect(mensajeError({ status: 403, message: "No sos el creador" })).toBe("No sos el creador");
  });

  it("sin status (error de red, TypeError) devuelve el mensaje original", () => {
    expect(mensajeError({ message: "Failed to fetch" })).toBe("Failed to fetch");
  });

  it("con null/undefined devuelve un fallback genérico", () => {
    expect(mensajeError(null)).toBe("Algo salió mal. Probá de nuevo.");
    expect(mensajeError(undefined)).toBe("Algo salió mal. Probá de nuevo.");
  });
});