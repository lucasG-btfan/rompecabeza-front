import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { emparejamientosApi } from "../api/emparejamientos";
import type { PartidaLobby } from "../types";
import { mensajeError } from "../utils/errores";

/**
 * Hook del flujo de matchmaking 1v1 del lobby (C-17, D13).
 *
 * Máquina de estados: `idle | esperando | emparejado | cancelado | expirado |
 * tiempo_agotado | error`.
 *
 * - `crearEmparejamiento(codigo)` hace el POST match-or-wait y arranca el poll
 *   de `GET /emparejamientos/estado` cada 3s (`setInterval` + cleanup en
 *   desmontaje, patrón de los hooks de juego del proyecto).
 * - Reloj de 90s desde `Date.now()`: al agotarse sin emparejar →
 *   `tiempo_agotado`.
 * - `cancelar()` → DELETE → `cancelado`; si el backend responde 400 ("El duelo
 *   ya comenzó") se sincroniza con un poll inmediato.
 * - `reintentar()` vuelve a encolar la misma partida.
 * - Errores 401/403/409 (y de red) → `error` con mensaje humanizado vía
 *   `mensajeError` (util existente).
 */

export type EstadoEspera =
  | "idle"
  | "esperando"
  | "emparejado"
  | "cancelado"
  | "expirado"
  | "tiempo_agotado"
  | "error";

/** Límite de espera antes de rendirse (D13). */
export const TIEMPO_ESPERA_MAX_SEG = 90;
/** Poll del estado del duelo (D13). */
export const POLL_INTERVALO_MS = 3_000;

export interface UseEmparejamientoResult {
  estado: EstadoEspera;
  /** Partida del duelo (del payload de `EmparejamientoEstadoResponse`). */
  partida: PartidaLobby | null;
  /** Username del rival (solo cuando `estado === "emparejado"`). */
  rival: string | null;
  /** Segundos restantes del reloj de 90s. */
  segundosRestantes: number;
  /** Código de la partida en juego (para navegar al emparejarse). */
  codigoPartida: string | null;
  error: string | null;
  crearEmparejamiento: (codigo: string) => Promise<void>;
  cancelar: () => Promise<void>;
  reintentar: () => Promise<void>;
  /** Vuelve a `idle` (carrusel) sin cancelar nada en el backend: se usa
   *  después de una cancelación o error para volver a la navegación. */
  resetear: () => void;
}

export function useEmparejamiento(): UseEmparejamientoResult {
  const [estado, setEstado] = useState<EstadoEspera>("idle");
  const [partida, setPartida] = useState<PartidaLobby | null>(null);
  const [rival, setRival] = useState<string | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState(TIEMPO_ESPERA_MAX_SEG);
  const [codigoPartida, setCodigoPartida] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enPollRef = useRef(false);
  const codigoRef = useRef<string | null>(null);
  const deadlineRef = useRef(0);

  function limpiarTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    enPollRef.current = false;
  }

  async function sincronizarEstado() {
    if (enPollRef.current) return;
    enPollRef.current = true;
    try {
      const res = await emparejamientosApi.estado();
      if (res.estado === "esperando") {
        setEstado("esperando");
        setPartida(res.partida ?? null);
      } else if (res.estado === "emparejado") {
        setEstado("emparejado");
        setPartida(res.partida ?? null);
        setRival(res.rival ?? null);
        limpiarTimer();
      } else if (res.estado === "cancelado") {
        setEstado("cancelado");
        limpiarTimer();
      } else if (res.estado === "expirado") {
        setEstado("expirado");
        limpiarTimer();
      }
      // estado null: sin duelo ni transición reportada → seguimos esperando
      // (el reloj de 90s corta la espera en último recurso).
      if (res.estado === "esperando") {
        setSegundosRestantes(
          Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)),
        );
      }
    } catch (e) {
      // Un poll fallido no corta la espera: se reintenta en el próximo tick.
      // Solo los errores del POST/cancelar pasan a `error`.
      console.warn("poll de emparejamiento falló", e);
    } finally {
      enPollRef.current = false;
    }
  }

  function arrancarTimer() {
    limpiarTimer();
    deadlineRef.current = Date.now() + TIEMPO_ESPERA_MAX_SEG * 1000;
    setSegundosRestantes(TIEMPO_ESPERA_MAX_SEG);

    // Un solo intervalo de 1s: actualiza el reloj y cada 3 ticks hace el poll.
    let ticks = 0;
    timerRef.current = setInterval(() => {
      ticks += 1;

      const restante = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      );
      setSegundosRestantes(restante);

      if (restante <= 0) {
        limpiarTimer();
        setEstado("tiempo_agotado");
        return;
      }

      if (ticks % Math.round(POLL_INTERVALO_MS / 1000) === 0) {
        void sincronizarEstado();
      }
    }, 1000);
  }

  // Cleanup en desmontaje (patrón de hooks del proyecto).
  useEffect(() => {
    return () => limpiarTimer();
  }, []);

  async function crearEmparejamiento(codigo: string) {
    codigoRef.current = codigo;
    setCodigoPartida(codigo);
    setError(null);
    setRival(null);
    setEstado("esperando");
    arrancarTimer();

    try {
      const res = await emparejamientosApi.crear(codigo);
      setPartida(res.partida ?? null);
      if (res.estado === "emparejado") {
        setEstado("emparejado");
        setRival(res.rival ?? null);
        limpiarTimer();
      }
      // esperando: el poll ya está corriendo y detectará la transición.
    } catch (e) {
      limpiarTimer();
      setCodigoPartida(null);
      setEstado("error");
      setError(
        e instanceof ApiError
          ? mensajeError(e)
          : e instanceof Error
            ? mensajeError({ message: e.message })
            : mensajeError(null),
      );
    }
  }

  async function cancelar() {
    try {
      await emparejamientosApi.cancelar();
      setEstado("cancelado");
      limpiarTimer();
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        // El duelo ya comenzó: sincronizamos con el estado real.
        void sincronizarEstado();
        return;
      }
      limpiarTimer();
      setEstado("error");
      setError(
        e instanceof ApiError
          ? mensajeError(e)
          : e instanceof Error
            ? mensajeError({ message: e.message })
            : mensajeError(null),
      );
    }
  }

  async function reintentar() {
    const codigo = codigoRef.current;
    if (codigo === null) return;
    await crearEmparejamiento(codigo);
  }

  function resetear() {
    limpiarTimer();
    setEstado("idle");
    setPartida(null);
    setRival(null);
    setSegundosRestantes(TIEMPO_ESPERA_MAX_SEG);
    setCodigoPartida(null);
    setError(null);
  }

  return {
    estado,
    partida,
    rival,
    segundosRestantes,
    codigoPartida,
    error,
    crearEmparejamiento,
    cancelar,
    reintentar,
    resetear,
  };
}