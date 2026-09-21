import type { ChangeEvent, Dispatch, KeyboardEvent, MutableRefObject, SetStateAction } from "react";
import type {
  GrillaCrucigrama,
  OrientacionCrucigrama,
  PalabraGrilla,
} from "../../types";
import {
  borrarLetra,
  celdaAdyacente,
  celdasDePalabraGrilla,
  indiceTrasBorrado,
  palabraEnCelda,
  respuestaDePalabra,
  siguienteCeldaVacia,
  type CeldaTablero,
  type FlechaTeclado,
} from "./logica";
import { idsCandidatos, type PistasResueltas } from "./pistas";

/**
 * Mecánica de ENTRADA del crucigrama jugable (C-14, D9): Backspace con
 * retroceso, flechas intra/inter-palabra, Tab para saltar de pista y el
 * tipeo 1 a 1 con auto-avance y validación automática.
 *
 * Extraído de `useCrucigramaJuego` sin cambio de comportamiento (regla dura
 * 8: el hook padre quedaba sobre 400 líneas). Todo el ESTADO vive en el padre;
 * este hook recibe dependencias (grilla, tablero, foco, letrasRef, etc.) y
 * callbacks (`activarPalabra`, `validar`, setters) y produce SOLO los dos
 * handlers que la UI consume: `manejarTeclado` y `manejarCambio`.
 */

/** Clave canónica de una celda "fila,columna" para Map/Set (compartida con el
 * padre, que la usa para resolver la primera celda vacía al activar). */
export function claveCelda(fila: number, columna: number): string {
  return `${fila},${columna}`;
}

interface CeldaRef {
  fila: number;
  columna: number;
}

/** Estado y cómputos que la mecánica de entrada necesita del padre. */
export interface DependenciasTeclado {
  grilla: GrillaCrucigrama | null;
  tablero: CeldaTablero[][];
  palabraActiva: PalabraGrilla | null;
  celdaFoco: { fila: number; columna: number } | null;
  letrasRef: MutableRefObject<Map<string, string>>;
  enviando: boolean;
  encontradasIds: Set<string>;
  /** Pistas c-21 (D2): resolución (numero, orientacion) -> id/estado. */
  pistas: PistasResueltas;
}

/** Muta estados del padre y le avisa para validar contra el backend. */
export interface CallbacksTeclado {
  activarPalabra: (palabra: PalabraGrilla) => void;
  validar: (palabra: PalabraGrilla, mapa: Map<string, string>) => void;
  setLetras: Dispatch<SetStateAction<Map<string, string>>>;
  setCeldaFoco: (celda: { fila: number; columna: number } | null) => void;
}

export interface CrucigramaTeclado {
  manejarTeclado: (e: KeyboardEvent<HTMLInputElement>) => void;
  manejarCambio: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function useCrucigramaTeclado(
  deps: DependenciasTeclado,
  callbacks: CallbacksTeclado,
): CrucigramaTeclado {
  const {
    grilla,
    tablero,
    palabraActiva,
    celdaFoco,
    letrasRef,
    enviando,
    encontradasIds,
    pistas,
  } = deps;
  const { activarPalabra, validar, setLetras, setCeldaFoco } = callbacks;

  /**
   * Backspace (C-11, defecto QA): UN press borra UNA letra y retrocede, según
   * la semántica de `indiceTrasBorrado` (spec: "borra la letra actual y
   * retrocede"). Antes el diseño era mutuamente excluyente: celda con letra
   * borraba pero no retrocedía, y celda vacía retrocedía pero no borraba —
   * "liona" solo borraba las 2 últimas letras y el foco quedaba clavado.
   */
  function manejarBorrado(indice: number, celdas: CeldaRef[]) {
    const celda = celdas[indice];
    if (!celda) return;
    const teniaLetra = letrasRef.current.has(claveCelda(celda.fila, celda.columna));
    const { indiceBorrado, nuevoFoco } = indiceTrasBorrado(indice, teniaLetra, celdas.length);
    if (indiceBorrado === null) return; // inicio de la palabra o índice inválido: nada
    const celdaBorrada = celdas[indiceBorrado];
    // C-24 (invariante del espejo, D2/D5): TODO borrado debe sincronizar
    // `letrasRef.current` en el MISMO tick — sin esto, `manejarCambio` copia
    // un espejo stale y reinserta letras viejas (bug 'letras fantasma').
    // `borrarLetra` es la única vía de borrado (lógica pura testeada en
    // logica.test.ts); el flujo es el mismo que `manejarCambio` (230-233).
    const m = borrarLetra(letrasRef.current, celdaBorrada);
    letrasRef.current = m;
    setLetras(m);
    setCeldaFoco(celdas[nuevoFoco]);
  }

  /** Flechas dentro de la palabra activa (eje) o salto a la palabra vecina
   * (eje perpendicular — comportamiento clásico de crucigrama). */
  function manejarFlecha(
    key: string,
    indice: number,
    celdas: CeldaRef[],
    fila: number,
    columna: number,
  ) {
    if (!palabraActiva || !grilla) return;
    const horizontal = palabraActiva.orientacion === "H";
    if (horizontal && key === "ArrowLeft" && indice > 0) {
      setCeldaFoco(celdas[indice - 1]);
      return;
    }
    if (horizontal && key === "ArrowRight" && indice < celdas.length - 1) {
      setCeldaFoco(celdas[indice + 1]);
      return;
    }
    if (!horizontal && key === "ArrowUp" && indice > 0) {
      setCeldaFoco(celdas[indice - 1]);
      return;
    }
    if (!horizontal && key === "ArrowDown" && indice < celdas.length - 1) {
      setCeldaFoco(celdas[indice + 1]);
      return;
    }

    // Eje perpendicular (C-12, D3): celda vecina en la dirección de la flecha
    // (spec: "el foco nunca queda atrapado en el eje de la palabra activa").
    // `celdaAdyacente` resuelve bordes y celdas negras como función pura.
    const destino = celdaAdyacente(
      fila,
      columna,
      palabraActiva.orientacion,
      key as FlechaTeclado,
      tablero,
    );
    if (!destino) return;
    const preferencia: OrientacionCrucigrama = palabraActiva.orientacion === "H" ? "V" : "H";
    const palabra = palabraEnCelda(grilla, destino.fila, destino.columna, preferencia);
    if (palabra && palabra.numero !== palabraActiva.numero) {
      activarPalabra(palabra); // reenfoca a su primera vacía
    }
    // El foco queda en la celda adyacente (pisa el reenfoque de activarPalabra
    // solo si la activación procedió: misma semántica que manejarClickCelda).
    setCeldaFoco(destino);
  }

  /** Tab: siguiente/anterior palabra sin encontrar (orden de pista). */
  function activarSiguientePalabra(direccion: 1 | -1) {
    if (!grilla) return;
    const palabras = [...grilla.palabras].sort((a, b) => a.numero - b.numero);
    const indice = palabraActiva
      ? palabras.findIndex((w) => w.numero === palabraActiva?.numero)
      : -1;
    for (let paso = 1; paso <= palabras.length; paso++) {
      const idx = (indice + direccion * paso + palabras.length) % palabras.length;
      const palabra = palabras[idx];
      // Resolución por palabra (c-21): pendiente => jugable; resuelta y
      // encontrada => salta. Sin candidatos => jugable (defensivo).
      const ids = idsCandidatos(pistas, palabra);
      const encontrada = ids.some((id) => encontradasIds.has(id));
      if (!encontrada) {
        activarPalabra(palabra);
        return;
      }
    }
  }

  function manejarTeclado(e: KeyboardEvent<HTMLInputElement>) {
    if (enviando || !palabraActiva || !celdaFoco) return;
    const celdas = celdasDePalabraGrilla(palabraActiva);
    const indice = celdas.findIndex(
      (c) => c.fila === celdaFoco.fila && c.columna === celdaFoco.columna,
    );
    if (indice === -1) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      manejarBorrado(indice, celdas);
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      manejarFlecha(e.key, indice, celdas, celdaFoco.fila, celdaFoco.columna);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (respuestaDePalabra(palabraActiva, letrasRef.current)) {
        void validar(palabraActiva, letrasRef.current);
      } else {
        const primeraVacia = celdas.find((c) => !letrasRef.current.has(claveCelda(c.fila, c.columna)));
        if (primeraVacia) setCeldaFoco(primeraVacia);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      activarSiguientePalabra(e.shiftKey ? -1 : 1);
    }
  }

  /** Cambio de value en el input (desktop + mobile/IME): toma la última letra
   * tipeada, auto-avanza y valida al completar la palabra. */
  function manejarCambio(e: ChangeEvent<HTMLInputElement>) {
    if (enviando || !palabraActiva || !celdaFoco) return;
    const valor = e.target.value;
    const anterior = letrasRef.current.get(claveCelda(celdaFoco.fila, celdaFoco.columna)) ?? "";

    // Borrado detectado por value más corto (mobile/IME no siempre dispara
    // Backspace por keydown).
    if (valor.length < anterior.length) {
      const celdas = celdasDePalabraGrilla(palabraActiva);
      const indice = celdas.findIndex(
        (c) => c.fila === celdaFoco.fila && c.columna === celdaFoco.columna,
      );
      manejarBorrado(indice, celdas);
      return;
    }

    // Normalizamos: mayúscula, sin acentos (la grilla es A-Z; la Ñ se respeta
    // porque es letra del alfabeto español).
    const letra = valor
      .slice(-1)
      .toUpperCase()
      .replace(/[ÁÉÍÓÚÜ]/g, (c) => "AEIOUU"["ÁÉÍÓÚÜ".indexOf(c)]);
    if (!/^[A-ZÑ]$/.test(letra)) return;

    const nuevoMapa = new Map(letrasRef.current);
    nuevoMapa.set(claveCelda(celdaFoco.fila, celdaFoco.columna), letra);
    letrasRef.current = nuevoMapa;
    setLetras(nuevoMapa);

    const celdas = celdasDePalabraGrilla(palabraActiva);
    const indice = celdas.findIndex(
      (c) => c.fila === celdaFoco.fila && c.columna === celdaFoco.columna,
    );
    const siguiente = siguienteCeldaVacia(celdas, nuevoMapa, indice);
    if (siguiente) {
      setCeldaFoco(siguiente);
    } else {
      // Palabra completa → validación automática (D4).
      void validar(palabraActiva, nuevoMapa);
    }
  }

  return { manejarTeclado, manejarCambio };
}