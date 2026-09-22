import { useCallback, useEffect, useRef, useState } from "react";
import { emparejamientosApi } from "../api/emparejamientos";
import type { ResultadoDuelo } from "../types";
import { POLL_INTERVALO_MS } from "./useEmparejamiento";
export type EstadoDuelo = "idle" | "activo" | "finalizado" | "expirado" | "error";

export interface UseDueloResult {
  estado: EstadoDuelo;
  resultado: ResultadoDuelo | null;
  rival: string | null;
  rivalContador: number | null;
  arrancar: (codigo: string) => void;
  finalizar: (res: ResultadoDuelo) => void;
}


export function useDuelo(): UseDueloResult {
  const [estado, setEstado] = useState<EstadoDuelo>("idle");
  const [resultado, setResultado] = useState<ResultadoDuelo | null>(null);
  const [rival, setRival] = useState<string | null>(null);
  const [rivalContador, setRivalContador] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enPollRef = useRef(false);
  const codigoRef = useRef<string | null>(null);

  function limpiar() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    enPollRef.current = false;
  }

  const finalizar = useCallback((res: ResultadoDuelo) => {
    limpiar();
    setResultado(res);
    setRival(res.rival);
    setEstado("finalizado");
  }, []);

  useEffect(() => () => limpiar(), []);

  const arrancar = useCallback(
    (codigo: string) => {
      if (codigoRef.current === codigo && timerRef.current !== null) return;

      codigoRef.current = codigo;
      setResultado(null);
      setRival(null);
      setRivalContador(null);
      setEstado("activo");
      limpiar();

      timerRef.current = setInterval(async () => {
        if (enPollRef.current) return;
        enPollRef.current = true;
        try {
          const res = await emparejamientosApi.estado()
          if (res.estado === "emparejado") {
            if (res.rival != null) setRival(res.rival);
            if (res.rival_palabras != null) setRivalContador(res.rival_palabras);
          }
          if (res.estado === "finalizado" && res.resultado != null) {
            finalizar(res.resultado);
          }
          if (res.estado === "expirado") {
            setEstado("expirado");
            limpiar();
          }
        } catch (e) {
          console.warn("poll del duelo falló", e);
        } finally {
          enPollRef.current = false;
        }
      }, POLL_INTERVALO_MS);
    },
    [finalizar],
  );

  return { estado, resultado, rival, rivalContador, arrancar, finalizar };
}