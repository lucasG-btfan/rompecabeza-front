import { describe, expect, test } from "vitest";
import {
  nuevaFila,
  agregarFila,
  quitarFila,
  actualizarFila,
  filasAPalabras,
  type FilaPalabra,
} from "./filasPalabras";
import type { PalabraInput } from "../types";

describe("nuevaFila", () => {
  test("devuelve una fila vacía lista para cargar", () => {
    expect(nuevaFila()).toEqual({ palabra: "", explicacion: "" });
  });
});

describe("agregarFila", () => {
  test("agrega una fila vacía al final sin mutar el original (D2, inmutabilidad)", () => {
    const filas: FilaPalabra[] = [{ palabra: "CASA", explicacion: "" }];
    const resultado = agregarFila(filas);

    expect(resultado).toEqual([
      { palabra: "CASA", explicacion: "" },
      { palabra: "", explicacion: "" },
    ]);
    expect(filas).toEqual([{ palabra: "CASA", explicacion: "" }]);
    expect(resultado).not.toBe(filas);
  });
});

describe("quitarFila", () => {
  test("elimina la fila del índice pedido", () => {
    const filas: FilaPalabra[] = [
      { palabra: "CASA", explicacion: "" },
      { palabra: "PERRO", explicacion: "" },
    ];
    expect(quitarFila(filas, 0)).toEqual([{ palabra: "PERRO", explicacion: "" }]);
  });

  test("es no-op cuando queda una sola fila (no se puede quitar la última — R1)", () => {
    const filas: FilaPalabra[] = [{ palabra: "CASA", explicacion: "" }];
    expect(quitarFila(filas, 0)).toEqual([{ palabra: "CASA", explicacion: "" }]);
  });
});

describe("actualizarFila", () => {
  test("aplica un cambio parcial en el índice sin mutar el original (D2)", () => {
    const filas: FilaPalabra[] = [
      { palabra: "CASA", explicacion: "" },
      { palabra: "", explicacion: "" },
    ];
    const resultado = actualizarFila(filas, 1, { palabra: "PERRO" });

    expect(resultado).toEqual([
      { palabra: "CASA", explicacion: "" },
      { palabra: "PERRO", explicacion: "" },
    ]);
    expect(filas).toEqual([
      { palabra: "CASA", explicacion: "" },
      { palabra: "", explicacion: "" },
    ]);
  });
});

describe("filasAPalabras", () => {
  test("en crucigrama convierte fila con pista a PalabraInput con explicacion", () => {
    const filas: FilaPalabra[] = [{ palabra: "CASA", explicacion: "donde vivís" }];
    expect(filasAPalabras(filas, "crucigrama")).toEqual([
      { palabra: "CASA", explicacion: "donde vivís" } satisfies PalabraInput,
    ]);
  });

  test("en crucigrama NO manda explicacion cuando la pista está vacía", () => {
    const filas: FilaPalabra[] = [{ palabra: "CASA", explicacion: "" }];
    const resultado = filasAPalabras(filas, "crucigrama");
    expect(resultado).toEqual([{ palabra: "CASA" }]);
    expect(resultado[0]).not.toHaveProperty("explicacion");
  });

  test("en sopa nunca manda explicacion, aunque exista en el estado de la fila (R3)", () => {
    const filas: FilaPalabra[] = [{ palabra: "CASA", explicacion: "donde vivís" }];
    const resultado = filasAPalabras(filas, "sopa");
    expect(resultado).toEqual([{ palabra: "CASA" }]);
    expect(resultado[0]).not.toHaveProperty("explicacion");
  });

  test("descarta filas vacías o de solo espacios", () => {
    const filas: FilaPalabra[] = [
      { palabra: "CASA", explicacion: "" },
      { palabra: "   ", explicacion: "" },
      { palabra: "", explicacion: "" },
    ];
    expect(filasAPalabras(filas, "crucigrama")).toEqual([{ palabra: "CASA" }]);
  });

  test("trimea palabra y pista", () => {
    const filas: FilaPalabra[] = [{ palabra: "  CO-AUTOR  ", explicacion: "  algo  " }];
    expect(filasAPalabras(filas, "crucigrama")).toEqual([
      { palabra: "CO-AUTOR", explicacion: "algo" },
    ]);
  });
});
