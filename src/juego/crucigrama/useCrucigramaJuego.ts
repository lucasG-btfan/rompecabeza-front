import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { ApiError } from "../../api/client";
import { partidasApi } from "../../api/partidas";
import type {
  EstadoPartida,
  GrillaCrucigrama,
  OrientacionCrucigrama,
  PalabraGrilla,
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
import { claveCelda, useCrucigramaTeclado } from "./useCrucigramaTeclado";

/**
 * Hook del modo crucigrama JUGABLE (C-10, D4; C-14): TODO el estado y la
 * mecánica del juego. Extraído de `CrucigramaGame` para separar estado de la
 * presentación (`TableroCrucigrama`, `PanelPistas`, container).
 *
 * C-14 (progreso efímero): el progreso vive SOLO en memoria de la sesión.
 * No hay persistencia por jugador (ni backend ni localStorage): al salir y
 * volver, la partida arranca de cero. `encontradasIds` se deriva del estado
 * que trae el backend (`estado.palabras.encontrada`).
 *
 * Maneja la palabra activa, el foco, la validación automática al completar
 * una palabra vía `responderPalabra` (D1) y el highlight de la palabra recién
 * encontrada. La entrada de teclado/tipeo (Backspace, flechas, Tab, cambio de
 * celda) vive en `useCrucigramaTeclado` (C-14, D9).
 *
 * La lógica pura (testeada con vitest) vive en `logica.ts` y `compartido/progreso.ts`.
 */

export interface UseCrucigramaJuegoProps {
  codigo: string;
  estado: EstadoPartida;
  onPalabraEncontrada?: (palabraId: string) => void;
  onProgreso?: (encontradas: number, total: number) => void;
}

interface CeldaRef {
  fila: number;
  columna: number;
}

/** Superficie pública del hook: lo que el container y los componentes de
 * presentación necesitan para renderizar e interactuar. */
export interface CrucigramaJuego {
  grilla: GrillaCrucigrama | null;
  tablero: CeldaTablero[][];
  letras: Map<string, string>;
  celdasActivas: Set<string>;
  celdasEncontradas: Set<string>;
  celdasError: Set<string>;
  celdaFoco: { fila: number; columna: number } | null;
  /** Número de pista de la palabra recién encontrada (highlight temporal,
   *  C-12/D4): anima sus celdas ~800ms antes de quedar fijadas. */
  palabraResaltada: number | null;
  idPorNumero: Map<number, string>;
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
  // Grilla del crucigrama (contrato D6). En estado activo SIEMPRE es un
  // objeto GrillaCrucigrama; defensivo por si llega una sopa por error.
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
  const [palabraResaltada, setPalabraResaltada] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Espejo sincrónico de `letras` para decisiones en handlers (el estado de
  // React no está commiteado en el mismo evento).
  const letrasRef = useRef(letras);
  const timeoutErrorRef = useRef<number | null>(null);
  const timeoutHighlightRef = useRef<number | null>(null);

  // Limpia los flashes (error, highlight) al desmontar o cambiar de partida.
  useEffect(
    () => () => {
      if (timeoutErrorRef.current != null) window.clearTimeout(timeoutErrorRef.current);
      if (timeoutHighlightRef.current != null) window.clearTimeout(timeoutHighlightRef.current);
    },
    [codigo],
  );

  // Mapeo numero <-> id (las pistas de la grilla D6 se identifican por numero;
  // el backend no expone el id en la grilla, pero `EstadoPalabra.numero` las
  // vincula — D3).
  const idPorNumero = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of estado.palabras) {
      if (p.numero != null) m.set(p.numero, p.id);
    }
    return m;
  }, [estado.palabras]);

  // IDs encontrados en la SESIÓN (C-14): progreso efímero, solo en memoria.
  const encontradasIds = useMemo(
    () => idsEncontrados(estado.palabras),
    [estado.palabras],
  );

  // Numeros de pista encontrados: repintan las celdas de la grilla D6.
  const numerosEncontrados = useMemo(() => {
    const set = new Set<number>();
    for (const [numero, id] of idPorNumero) {
      if (encontradasIds.has(id)) set.add(numero);
    }
    return set;
  }, [idPorNumero, encontradasIds]);

  const celdasEncontradas = useMemo(
    () => (grilla ? celdasDeEncontradas(grilla.palabras, numerosEncontrados) : new Set<string>()),
    [grilla, numerosEncontrados],
  );

  // Celdas que pertenecen a la palabra activa (editable + borde visible).
  const celdasActivas = useMemo(() => {
    if (!palabraActiva) return new Set<string>();
    return new Set(
      celdasDePalabraGrilla(palabraActiva).map((c) => claveCelda(c.fila, c.columna)),
    );
  }, [palabraActiva]);

  // Progreso hacia la pantalla madre (contador + banner de completado).
  const total = estado.palabras.length;
  useEffect(() => {
    onProgreso?.(encontradasIds.size, total);
  }, [encontradasIds.size, total, onProgreso]);

  /** Activa una palabra de la grilla (bloqueada si ya está encontrada). */
  function activarPalabra(palabra: PalabraGrilla) {
    const id = idPorNumero.get(palabra.numero);
    if (id && encontradasIds.has(id)) return; // encontrada: no se edita
    setPalabraActiva(palabra);
    setError(null);
    setCeldasError(new Set());
    const celdas = celdasDePalabraGrilla(palabra);
    const primeraVacia =
      celdas.find((c) => !letrasRef.current.has(claveCelda(c.fila, c.columna))) ?? celdas[0] ?? null;
    setCeldaFoco(primeraVacia);
  }

  /** Palabra que cubre una celda, con orientación preferida (H por defecto). */
  function manejarClickCelda(fila: number, columna: number) {
    // Sin grilla no hay juego posible (defensivo: solo llega con tipo crucigrama).
    if (!grilla) return;
    setError(null);
    setCeldasError(new Set());
    const celda = { fila, columna };

    // Click sobre la celda ya enfocada de la palabra activa → toggle H/V si
    // la celda es un cruce (D4). Fuera del cruce no pasa nada.
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

    // Click en otra celda: activa la palabra que la cubre (preferencia H y
    // caída a V). Si la única palabra ahí ya está encontrada pero hay un
    // cruce con una no encontrada, activamos la del cruce.
    const palabra = palabraEnCelda(grilla, fila, columna, "H");
    if (palabra) {
      const id = idPorNumero.get(palabra.numero);
      if (id && encontradasIds.has(id)) {
        const otra = palabraEnCelda(grilla, fila, columna, "V");
        if (otra && otra.numero !== palabra.numero) {
          const idOtra = idPorNumero.get(otra.numero);
          if (!idOtra || !encontradasIds.has(idOtra)) {
            activarPalabra(otra);
            setCeldaFoco(celda);
          }
        }
        return;
      }
      activarPalabra(palabra);
      // El foco queda en la celda clickeada (si está llena, el tipeo la
      // sobreescribe; el click sobre un input vacío ya la enfoca).
      setCeldaFoco(celda);
    }
  }

  /** Valida la palabra activa contra el backend (D1). */
  async function validar(palabra: PalabraGrilla, mapa: Map<string, string>) {
    if (enviando) return;
    const texto = respuestaDePalabra(palabra, mapa);
    if (!texto) return;
    const id = idPorNumero.get(palabra.numero);
    if (!id) return;

    setEnviando(true);
    setError(null);
    try {
      const resultado = await partidasApi.responderPalabra(codigo, id, texto);
      if (resultado.encontrada) {
        onPalabraEncontrada?.(id);
        // Highlight temporal de la palabra recién encontrada (C-12/D4): anima
        // sus celdas ~800ms antes de quedar fijadas como encontradas.
        setPalabraResaltada(palabra.numero);
        if (timeoutHighlightRef.current != null) window.clearTimeout(timeoutHighlightRef.current);
        timeoutHighlightRef.current = window.setTimeout(() => {
          setPalabraResaltada(null);
          timeoutHighlightRef.current = null;
        }, 800);
        // Letras quedan fijas (bloqueadas): la palabra pasa a pintarse como
        // encontrada y se deselecciona.
        setPalabraActiva(null);
        setCeldaFoco(null);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        // Letras incorrectas: limpiamos SOLO esta palabra, flasheamos sus
        // celdas en coral (estado de error) y re-enfocamos.
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
      } else {
        setError(e instanceof Error ? e.message : "No se pudo validar la palabra.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const tablero = useMemo(() => (grilla ? armarTablero(grilla) : []), [grilla]);

  // Mecánica de entrada (Backspace, flechas, Tab, tipeo): C-14, D9.
  const teclado = useCrucigramaTeclado(
    {
      grilla,
      tablero,
      palabraActiva,
      celdaFoco,
      letrasRef,
      enviando,
      encontradasIds,
      idPorNumero,
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
    idPorNumero,
    encontradasIds,
    error,
    activarPalabra,
    manejarClickCelda,
    manejarCambio: teclado.manejarCambio,
    manejarTeclado: teclado.manejarTeclado,
  };
}