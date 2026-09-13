import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { ApiError } from "../../api/client";
import { partidasApi } from "../../api/partidas";
import type {
  EstadoPartida,
  GrillaCrucigrama,
  OrientacionCrucigrama,
  PalabraGrilla,
  Posicion,
} from "../../types";
import {
  armarTablero,
  celdasDeEncontradas,
  celdasDePalabraGrilla,
  idsEncontrados,
  indiceTrasBorrado,
  palabraEnCelda,
  respuestaDePalabra,
  siguienteCeldaVacia,
  type CeldaTablero,
} from "./logica";

/**
 * Hook del modo crucigrama JUGABLE (C-10, D4): TODO el estado y la mecánica
 * del juego. Extraído de `CrucigramaGame` para separar estado/handlers de la
 * presentación (`TableroCrucigrama`, `PanelPistas`, container).
 *
 * Maneja la palabra activa, el foco, el tipeo 1 a 1 con auto-advance,
 * Backspace, flechas y Tab, y la validación automática al completar una
 * palabra vía `responderPalabra` (D1).
 *
 * - Registrado: el backend persiste el hallazgo y la grilla sanitizada revela
 *   las letras propias (D2); al acertar las letras quedan fijas localmente.
 * - Invitado: el backend no persiste nada (D1); el progreso vive en
 *   localStorage con `{id, posicion, letras}` (D7) para repintar al recargar.
 *
 * La lógica pura (testeada con vitest) vive en `logica.ts`.
 */

export interface UseCrucigramaJuegoProps {
  codigo: string;
  estado: EstadoPartida;
  esInvitado?: boolean;
  onPalabraEncontrada?: (palabraId: string) => void;
  onProgreso?: (encontradas: number, total: number) => void;
}

/** Hallazgo del invitado en localStorage (D7): las letras permiten repintar
 * la palabra sin depender de la grilla sanitizada (que oculta letras). */
export interface HallazgoLocal {
  id: string;
  posicion: Posicion | null;
  letras: string;
}

interface CeldaRef {
  fila: number;
  columna: number;
}

function claveCelda(fila: number, columna: number): string {
  return `${fila},${columna}`;
}

function claveProgreso(codigo: string): string {
  return `crucigrama_progreso_${codigo}`;
}

function leerProgresoLocal(codigo: string): HallazgoLocal[] {
  try {
    const raw = localStorage.getItem(claveProgreso(codigo));
    const arr = raw ? (JSON.parse(raw) as HallazgoLocal[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function guardarProgresoLocal(codigo: string, hallazgos: HallazgoLocal[]) {
  try {
    localStorage.setItem(claveProgreso(codigo), JSON.stringify(hallazgos));
  } catch {
    // localStorage no disponible (modo privado/errores): el juego sigue
    // funcionando, solo no se persiste el progreso del invitado.
  }
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
  esInvitado = false,
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
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [progresoLocal, setProgresoLocal] = useState<HallazgoLocal[]>(() =>
    esInvitado ? leerProgresoLocal(codigo) : [],
  );
  // Espejo sincrónico de `letras` para decisiones en handlers (el estado de
  // React no está commiteado en el mismo evento).
  const letrasRef = useRef(letras);
  const timeoutErrorRef = useRef<number | null>(null);

  // Limpia el flash de error al desmontar o cambiar de partida.
  useEffect(
    () => () => {
      if (timeoutErrorRef.current != null) window.clearTimeout(timeoutErrorRef.current);
    },
    [codigo],
  );

  // Palabras de la grilla por numero y mapeos numero <-> id.
  const palabrasPorNumero = useMemo(() => {
    const m = new Map<number, PalabraGrilla>();
    if (grilla) for (const w of grilla.palabras) m.set(w.numero, w);
    return m;
  }, [grilla]);

  const idPorNumero = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of estado.palabras) {
      if (p.numero != null) m.set(p.numero, p.id);
    }
    return m;
  }, [estado.palabras]);

  const numeroPorId = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of estado.palabras) {
      if (p.numero != null) m.set(p.id, p.numero);
    }
    return m;
  }, [estado.palabras]);

  // Al cambiar el código o el modo, recargamos el progreso local del invitado
  // y repintamos las letras de sus hallazgos (D7: posicion + letras).
  useEffect(() => {
    if (!esInvitado) return;
    const locales = leerProgresoLocal(codigo);
    setProgresoLocal(locales);
    if (locales.length === 0) return;
    setLetras((prev) => {
      const m = new Map(prev);
      for (const h of locales) {
        const numero = numeroPorId.get(h.id);
        if (numero == null || !h.letras) continue;
        const palabra = palabrasPorNumero.get(numero);
        if (!palabra) continue;
        const celdas = celdasDePalabraGrilla(palabra);
        h.letras.split("").forEach((l, i) => {
          const c = celdas[i];
          if (c) m.set(claveCelda(c.fila, c.columna), l.toUpperCase());
        });
      }
      return m;
    });
  }, [codigo, esInvitado, numeroPorId, palabrasPorNumero]);

  // IDs encontrados por ESTE jugador (backend + localStorage del invitado).
  const encontradasIds = useMemo(
    () => idsEncontrados(estado.palabras, progresoLocal),
    [estado.palabras, progresoLocal],
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
    setLetras((prev) => {
      const m = new Map(prev);
      m.delete(claveCelda(celdaBorrada.fila, celdaBorrada.columna));
      return m;
    });
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

    // Eje perpendicular: celda vecina en la dirección de la flecha.
    const vecina: CeldaRef | null =
      horizontal && key === "ArrowUp"
        ? { fila: fila - 1, columna }
        : horizontal && key === "ArrowDown"
          ? { fila: fila + 1, columna }
          : !horizontal && key === "ArrowLeft"
            ? { fila, columna: columna - 1 }
            : !horizontal && key === "ArrowRight"
              ? { fila, columna: columna + 1 }
              : null;
    if (!vecina) return;
    const preferencia: OrientacionCrucigrama = horizontal ? "V" : "H";
    const palabra = palabraEnCelda(grilla, vecina.fila, vecina.columna, preferencia);
    if (palabra && palabra.numero !== palabraActiva.numero) {
      activarPalabra(palabra);
    }
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
      const id = idPorNumero.get(palabra.numero);
      if (!id || !encontradasIds.has(id)) {
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
        // Invitado: persistir hallazgo completo (D7) para repintar al recargar.
        if (esInvitado) {
          setProgresoLocal((prev) => {
            if (prev.some((h) => h.id === id)) return prev;
            const sig = [...prev, { id, posicion: resultado.posicion ?? null, letras: texto }];
            guardarProgresoLocal(codigo, sig);
            return sig;
          });
        }
        onPalabraEncontrada?.(id);
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

  return {
    grilla,
    tablero,
    letras,
    celdasActivas,
    celdasEncontradas,
    celdasError,
    celdaFoco,
    idPorNumero,
    encontradasIds,
    error,
    activarPalabra,
    manejarClickCelda,
    manejarCambio,
    manejarTeclado,
  };
}