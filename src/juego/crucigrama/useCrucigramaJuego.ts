import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { ApiError } from "../../api/client";
import { partidasApi } from "../../api/partidas";
import type {
  EstadoPartida,
  GrillaCrucigrama,
  MarcarEncontradaOutput,
  OrientacionCrucigrama,
  PalabraGrilla,
  ResultadoDuelo,
} from "../../types";
import { idsEncontrados } from "../compartido/progreso";
import {
  armarTablero,
  celdasDeEncontradas,
  celdasDePalabraGrilla,
  palabraEnCelda,
  respuestaDePalabra,
  type CeldaTablero,
} from "./logica";
import {
  clavePista,
  fusionarPistas,
  idsCandidatos,
  resolverIdPorValidacion,
  resolverPistas,
  type ClavePista,
  type PistasResueltas,
  type ResultadoPruebaCandidato,
} from "./pistas";
import { claveCelda, useCrucigramaTeclado } from "./useCrucigramaTeclado";


export interface UseCrucigramaJuegoProps {
  codigo: string;
  estado: EstadoPartida;
  onPalabraEncontrada?: (
    palabraId: string,
    dueloFinalizado?: ResultadoDuelo | null,
  ) => void;
  onProgreso?: (encontradas: number, total: number) => void;
}

interface CeldaRef {
  fila: number;
  columna: number;
}

export interface CrucigramaJuego {
  grilla: GrillaCrucigrama | null;
  tablero: CeldaTablero[][];
  letras: Map<string, string>;
  celdasActivas: Set<string>;
  celdasEncontradas: Set<string>;
  celdasError: Set<string>;
  celdaFoco: { fila: number; columna: number } | null;
  palabraResaltada: ClavePista | null;
  pistas: PistasResueltas;
  encontradasIds: Set<string>;
  error: string | null;
  activarPalabra: (palabra: PalabraGrilla) => void;
  manejarClickCelda: (fila: number, columna: number) => void;
  manejarCambio: (e: ChangeEvent<HTMLInputElement>) => void;
  manejarTeclado: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function useCrucigramaJuego({
  codigo,
  estado,
  onPalabraEncontrada,
  onProgreso,
}: UseCrucigramaJuegoProps): CrucigramaJuego {
  const grilla = useMemo(() => {
    if (estado.tipo !== "crucigrama") return null;
    return typeof estado.grilla === "object" && estado.grilla !== null
      ? (estado.grilla as GrillaCrucigrama)
      : null;
  }, [estado.tipo, estado.grilla]);

  const [palabraActiva, setPalabraActiva] = useState<PalabraGrilla | null>(null);
  const [celdaFoco, setCeldaFoco] = useState<CeldaRef | null>(null);
  const [letras, setLetras] = useState<Map<string, string>>(new Map());
  const [celdasError, setCeldasError] = useState<Set<string>>(new Set());
  const [palabraResaltada, setPalabraResaltada] = useState<ClavePista | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const letrasRef = useRef(letras);
  const timeoutErrorRef = useRef<number | null>(null);
  const timeoutHighlightRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutErrorRef.current != null) window.clearTimeout(timeoutErrorRef.current);
      if (timeoutHighlightRef.current != null) window.clearTimeout(timeoutHighlightRef.current);
    },
    [codigo],
  );

  const [cachePistas, setCachePistas] = useState<Map<ClavePista, string>>(new Map());

  const pistas = useMemo((): PistasResueltas => {
    if (!grilla) {
      return {
        porClave: new Map(),
        pendientes: new Map(),
        colisiones: new Set(),
      };
    }
    return fusionarPistas(resolverPistas(grilla, estado), cachePistas);
  }, [grilla, estado, cachePistas]);

  const encontradasIds = useMemo(
    () => idsEncontrados(estado.palabras),
    [estado.palabras],
  );

  const clavesEncontradas = useMemo(() => {
    const set = new Set<ClavePista>();
    if (!grilla) return set;
    for (const w of grilla.palabras) {
      if (idsCandidatos(pistas, w).some((id) => encontradasIds.has(id))) {
        set.add(clavePista(w.numero, w.orientacion));
      }
    }
    return set;
  }, [grilla, pistas, encontradasIds]);

  const celdasEncontradas = useMemo(
    () => (grilla ? celdasDeEncontradas(grilla.palabras, clavesEncontradas) : new Set<string>()),
    [grilla, clavesEncontradas],
  );

  const celdasActivas = useMemo(() => {
    if (!palabraActiva) return new Set<string>();
    return new Set(
      celdasDePalabraGrilla(palabraActiva).map((c) => claveCelda(c.fila, c.columna)),
    );
  }, [palabraActiva]);

  const total = estado.palabras.length;
  useEffect(() => {
    onProgreso?.(encontradasIds.size, total);
  }, [encontradasIds.size, total, onProgreso]);

  function activarPalabra(palabra: PalabraGrilla) {
    const ids = idsCandidatos(pistas, palabra);
    if (ids.length > 0 && ids.some((id) => encontradasIds.has(id))) {
      return; // encontrada: no se edita
    }
    setPalabraActiva(palabra);
    setError(null);
    setCeldasError(new Set());
    const celdas = celdasDePalabraGrilla(palabra);
    const primeraVacia =
      celdas.find((c) => !letrasRef.current.has(claveCelda(c.fila, c.columna))) ?? celdas[0] ?? null;
    setCeldaFoco(primeraVacia);
  }

  function manejarClickCelda(fila: number, columna: number) {
    if (!grilla) return;
    setError(null);
    setCeldasError(new Set());
    const celda = { fila, columna };

    if (
      palabraActiva &&
      celdaFoco &&
      celdaFoco.fila === fila &&
      celdaFoco.columna === columna
    ) {
      const otraOrientacion: OrientacionCrucigrama =
        palabraActiva.orientacion === "H" ? "V" : "H";
      const palabraOpuesta = palabraEnCelda(grilla, fila, columna, otraOrientacion);
      if (palabraOpuesta && palabraOpuesta.numero !== palabraActiva.numero) {
        activarPalabra(palabraOpuesta);
        setCeldaFoco(celda);
      }
      return;
    }

    const palabra = palabraEnCelda(grilla, fila, columna, "H");
    if (palabra) {
      const ids = idsCandidatos(pistas, palabra);
      const encontrada = ids.length > 0 && ids.some((id) => encontradasIds.has(id));
      if (encontrada) {
        const otra = palabraEnCelda(grilla, fila, columna, "V");
        if (otra && otra.numero !== palabra.numero) {
          const idsOtra = idsCandidatos(pistas, otra);
          const encontradaOtra = idsOtra.some((id) => encontradasIds.has(id));
          if (idsOtra.length === 0 || !encontradaOtra) {
            activarPalabra(otra);
            setCeldaFoco(celda);
          }
        }
        return;
      }
      activarPalabra(palabra);
      setCeldaFoco(celda);
    }
  }

  async function validar(palabra: PalabraGrilla, mapa: Map<string, string>) {
    if (enviando) return;
    const texto = respuestaDePalabra(palabra, mapa);
    if (!texto) return;
    const candidatos = idsCandidatos(pistas, palabra);
    if (candidatos.length === 0) return; // sin señal estática: nada que validar

    setEnviando(true);
    setError(null);
    try {
      const aciertoRef: { resultado: MarcarEncontradaOutput | null } = { resultado: null };
      const probar = async (id: string): Promise<ResultadoPruebaCandidato> => {
        try {
          const resultado = await partidasApi.responderPalabra(codigo, id, texto);
          if (resultado.encontrada) {
            aciertoRef.resultado = resultado;
            return { id, resultado: "acierto" };
          }
          return { id, resultado: "error" };
        } catch (e) {
          if (e instanceof ApiError && e.status === 400) {
            return { id, resultado: "letrasIncorrectas" };
          }
          return { id, resultado: "error" };
        }
      };

      const decision = await resolverIdPorValidacion(candidatos, probar);

      if (decision.tipo === "error") {
        setError("No se pudo validar la palabra.");
        return;
      }

      if (decision.tipo === "letrasIncorrectas") {
        const celdas = celdasDePalabraGrilla(palabra);
        const claves = celdas.map((c) => claveCelda(c.fila, c.columna));
        setLetras((prev) => {
          const m = new Map(prev);
          for (const k of claves) m.delete(k);
          letrasRef.current = m;
          return m;
        });
        setCeldasError(new Set(claves));
        if (timeoutErrorRef.current != null) window.clearTimeout(timeoutErrorRef.current);
        timeoutErrorRef.current = window.setTimeout(() => {
          setCeldasError(new Set());
          timeoutErrorRef.current = null;
        }, 800);
        setError("Letras incorrectas: limpié la palabra, probá de nuevo.");
        setCeldaFoco(celdas[0] ?? null);
        return;
      }

      const id = decision.id;
      if (decision.cachear && grilla) {
        setCachePistas((prev) => {
          const m = new Map(prev);
          m.set(clavePista(palabra.numero, palabra.orientacion), id);
          for (const descartado of decision.descartados) {
            const hermana = grilla.palabras.find(
              (w) =>
                w.numero === palabra.numero &&
                w.orientacion !== palabra.orientacion &&
                !m.has(clavePista(w.numero, w.orientacion)),
            );
            if (hermana) m.set(clavePista(hermana.numero, hermana.orientacion), descartado);
          }
          return m;
        });
      }
      onPalabraEncontrada?.(id, aciertoRef.resultado?.duelo_finalizado ?? null);

      setPalabraResaltada(clavePista(palabra.numero, palabra.orientacion));
      if (timeoutHighlightRef.current != null) window.clearTimeout(timeoutHighlightRef.current);
      timeoutHighlightRef.current = window.setTimeout(() => {
        setPalabraResaltada(null);
        timeoutHighlightRef.current = null;
      }, 800);

      setPalabraActiva(null);
      setCeldaFoco(null);
    } finally {
      setEnviando(false);
    }
  }

  const tablero = useMemo(() => (grilla ? armarTablero(grilla) : []), [grilla]);

  const teclado = useCrucigramaTeclado(
    {
      grilla,
      tablero,
      palabraActiva,
      celdaFoco,
      letrasRef,
      enviando,
      encontradasIds,
      pistas,
    },
    {
      activarPalabra,
      validar: (palabra, mapa) => void validar(palabra, mapa),
      setLetras,
      setCeldaFoco,
    },
  );

  return {
    grilla,
    tablero,
    letras,
    celdasActivas,
    celdasEncontradas,
    celdasError,
    celdaFoco,
    palabraResaltada,
    pistas,
    encontradasIds,
    error,
    activarPalabra,
    manejarClickCelda,
    manejarCambio: teclado.manejarCambio,
    manejarTeclado: teclado.manejarTeclado,
  };
}