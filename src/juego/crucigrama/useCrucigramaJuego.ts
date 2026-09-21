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

/**
 * Hook del modo crucigrama JUGABLE (C-10, D4; C-14): TODO el estado y la
 * mecánica del juego. Extraído de `CrucigramaGame` para separar estado de la
 * presentación (`TableroCrucigrama`, `PanelPistas`, container).
 *
 * C-14 (progreso efímero): el progreso vive SOLO en memoria de la sesión
 * (sin backend ni localStorage); `encontradasIds` se deriva de
 * `estado.palabras.encontrada`.
 *
 * c-21 (pistas por palabra): el viejo `idPorNumero: Map<number, string>`
 * pisaba una de las dos palabras de un par colisionante H+V con el mismo
 * inicio (mismo numero de pista). Ahora las pistas se resuelven por clave
 * `(numero, orientacion)` en DOS planos (D2):
 *   - ESTÁTICO: `resolverPistas` — por `posicion.orientacion` (cuando viaja)
 *     o por exclusión cuando el número es único en la grilla;
 *   - DINÁMICO (solo pares colisionantes): la primera validación prueba los
 *     candidatos (máx 2 llamadas) y cachea el acierto + el descarte del par,
 *     con lo que ambas palabras quedan resueltas para el resto de la sesión.
 *
 * Maneja la palabra activa, el foco, la validación automática al completar
 * una palabra vía `responderPalabra` (D1) y el highlight de la palabra recién
 * encontrada. La entrada de teclado/tipeo (Backspace, flechas, Tab) vive en
 * `useCrucigramaTeclado` (C-14, D9); la lógica pura, en `logica.ts` + `pistas.ts`.
 */

export interface UseCrucigramaJuegoProps {
  codigo: string;
  estado: EstadoPartida;
  /** C-19 (D3/D5): el segundo parámetro propaga el `duelo_finalizado` de la
   *  respuesta al container (la jugada que corta muestra el resultado ya). */
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
  /** Clave (numero, orientacion) de la palabra recién encontrada (highlight
   *  temporal, C-12/D4): anima sus celdas ~800ms antes de quedar fijadas.
   *  c-21: clave en vez de numero porque un par colisionante comparte numero. */
  palabraResaltada: ClavePista | null;
  /** Pistas resueltas c-21 (D2): puente (numero, orientacion) -> id ESTÁTICO
   *  + caché dinámica de la sesión (pares colisionantes resueltos). */
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
  const [palabraResaltada, setPalabraResaltada] = useState<ClavePista | null>(null);
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

  // Pistas c-21 (D2): armado ESTÁTICO + caché DINÁMICA de la sesión.
  const [cachePistas, setCachePistas] = useState<Map<ClavePista, string>>(new Map());

  // Fusión (pistas.ts): las resoluciones dinámicas de la sesión ganan a las
  // estáticas y el par ya resuelto deja de estar pendiente/marcado.
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

  // IDs encontrados en la SESIÓN (C-14): progreso efímero, solo en memoria.
  const encontradasIds = useMemo(
    () => idsEncontrados(estado.palabras),
    [estado.palabras],
  );

  // Claves (numero, orientacion) de las palabras encontradas (c-21 D2, per-word):
  // un par colisionante H+V se pinta de a UNA palabra, nunca las dos juntas.
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
      // El foco queda en la celda clickeada (si está llena, el tipeo la
      // sobreescribe; el click sobre un input vacío ya la enfoca).
      setCeldaFoco(celda);
    }
  }

  /** Valida la palabra activa contra el backend (D1, c-21 D2.2). */
  async function validar(palabra: PalabraGrilla, mapa: Map<string, string>) {
    if (enviando) return;
    const texto = respuestaDePalabra(palabra, mapa);
    if (!texto) return;
    const candidatos = idsCandidatos(pistas, palabra);
    if (candidatos.length === 0) return; // sin señal estática: nada que validar

    setEnviando(true);
    setError(null);
    try {
      // Resultado completo de la llamada que acierta (propaga duelo_finalizado,
      // C-19): el probe devuelve solo la clasificación; acá guardamos el
      // detalle. Contenedor mutable (no `let` capturado: TS lo narra como
      // `never` tras el await y rompe el acceso a `duelo_finalizado`).
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
        return;
      }

      // ACIERTO: el id ganador + (si fue un par, D2.2) cachear en la sesión
      // la resolución dinámica: el ganador bajo la clave de ESTA palabra y los
      // descartados bajo las claves de las hermanas del par (mismo numero,
      // orientacion opuesta) — la exclusión queda resuelta para siempre.
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
      // Highlight temporal de la palabra recién encontrada (C-12/D4): anima
      // sus celdas ~800ms antes de quedar fijadas como encontradas.
      setPalabraResaltada(clavePista(palabra.numero, palabra.orientacion));
      if (timeoutHighlightRef.current != null) window.clearTimeout(timeoutHighlightRef.current);
      timeoutHighlightRef.current = window.setTimeout(() => {
        setPalabraResaltada(null);
        timeoutHighlightRef.current = null;
      }, 800);
      // Letras quedan fijas (bloqueadas): la palabra pasa a pintarse como
      // encontrada y se deselecciona.
      setPalabraActiva(null);
      setCeldaFoco(null);
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