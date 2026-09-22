import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { emparejamientosApi } from "../api/emparejamientos";
import type { PartidaLobby } from "../types";
import { mensajeError } from "../utils/errores";


export type EstadoEspera =
  | "idle"
  | "esperando"
  | "emparejado"
  | "cancelado"
  | "expirado"
  | "tiempo_agotado"
  | "error";

export const TIEMPO_ESPERA_MAX_SEG = 90;
export const POLL_INTERVALO_MS = 3_000;

export interface UseEmparejamientoResult {
  estado: EstadoEspera;
  partida: PartidaLobby | null;
  rival: string | null;
  segundosRestantes: number;
  codigoPartida: string | null;
  error: string | null;
  crearEmparejamiento: (codigo: string) => Promise<void>;
  cancelar: () => Promise<void>;
  reintentar: () => Promise<void>;
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
      if (res.estado === "esperando") {
        setSegundosRestantes(
          Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)),
        );
      }
    } catch (e) {
      console.warn("poll de emparejamiento falló", e);
    } finally {
      enPollRef.current = false;
    }
  }

  function arrancarTimer() {
    limpiarTimer();
    deadlineRef.current = Date.now() + TIEMPO_ESPERA_MAX_SEG * 1000;
    setSegundosRestantes(TIEMPO_ESPERA_MAX_SEG);

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