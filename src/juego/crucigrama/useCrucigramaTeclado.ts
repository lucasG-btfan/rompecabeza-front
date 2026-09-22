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

export function claveCelda(fila: number, columna: number): string {
  return `${fila},${columna}`;
}

interface CeldaRef {
  fila: number;
  columna: number;
}

export interface DependenciasTeclado {
  grilla: GrillaCrucigrama | null;
  tablero: CeldaTablero[][];
  palabraActiva: PalabraGrilla | null;
  celdaFoco: { fila: number; columna: number } | null;
  letrasRef: MutableRefObject<Map<string, string>>;
  enviando: boolean;
  encontradasIds: Set<string>;
  pistas: PistasResueltas;
}

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


  function manejarBorrado(indice: number, celdas: CeldaRef[]) {
    const celda = celdas[indice];
    if (!celda) return;
    const teniaLetra = letrasRef.current.has(claveCelda(celda.fila, celda.columna));
    const { indiceBorrado, nuevoFoco } = indiceTrasBorrado(indice, teniaLetra, celdas.length);
    if (indiceBorrado === null) return; // inicio de la palabra o índice inválido: nada
    const celdaBorrada = celdas[indiceBorrado];
    const m = borrarLetra(letrasRef.current, celdaBorrada);
    letrasRef.current = m;
    setLetras(m);
    setCeldaFoco(celdas[nuevoFoco]);
  }

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
    setCeldaFoco(destino);
  }

  function activarSiguientePalabra(direccion: 1 | -1) {
    if (!grilla) return;
    const palabras = [...grilla.palabras].sort((a, b) => a.numero - b.numero);
    const indice = palabraActiva
      ? palabras.findIndex((w) => w.numero === palabraActiva?.numero)
      : -1;
    for (let paso = 1; paso <= palabras.length; paso++) {
      const idx = (indice + direccion * paso + palabras.length) % palabras.length;
      const palabra = palabras[idx];
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

  function manejarCambio(e: ChangeEvent<HTMLInputElement>) {
    if (enviando || !palabraActiva || !celdaFoco) return;
    const valor = e.target.value;
    const anterior = letrasRef.current.get(claveCelda(celdaFoco.fila, celdaFoco.columna)) ?? "";

    if (valor.length < anterior.length) {
      const celdas = celdasDePalabraGrilla(palabraActiva);
      const indice = celdas.findIndex(
        (c) => c.fila === celdaFoco.fila && c.columna === celdaFoco.columna,
      );
      manejarBorrado(indice, celdas);
      return;
    }

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
      void validar(palabraActiva, nuevoMapa);
    }
  }

  return { manejarTeclado, manejarCambio };
}