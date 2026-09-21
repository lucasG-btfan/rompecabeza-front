import { useCallback, useEffect, useRef, useState } from "react";
import { emparejamientosApi } from "../api/emparejamientos";
import type { ResultadoDuelo } from "../types";
import { POLL_INTERVALO_MS } from "./useEmparejamiento";

export type EstadoDuelo = "idle" | "activo" | "finalizado" | "error";

export interface UseDueloResult {
  estado: EstadoDuelo;
  /** Resultado del duelo normalizado para este jugador (D5). */
  resultado: ResultadoDuelo | null;
  /** Username del rival (del poll `emparejado` o del resultado) — lo usa el
   *  copy del modal de abandono (D12). null mientras no se conozca. */
  rival: string | null;
  /** AMEND CAMBIO 2: contador del rival del backend por poll (~3s, D10) —
   *  alimenta el "n" del rival en el marcador "[J1] n/m [J2] n/m". null
   *  hasta el primer poll con `emparejado`. */
  rivalContador: number | null;
  /** Arranca el poll de `GET /emparejamientos/estado` cada 3s (D10). */
  arrancar: (codigo: string) => void;
  /** Terminación SÍNCRONA (D10): la jugada que corta o el abandono entregan
   *  el resultado sin esperar al siguiente poll. */
  finalizar: (res: ResultadoDuelo) => void;
}

/**
 * Hook del cierre del duelo 1v1 (C-19, D10/D6).
 *
 * Máquina de estados: `idle | activo | finalizado | error`.
 *
 * - `arrancar(codigo)` inicia el poll del estado cada 3s (`setInterval` +
 *   cleanup en desmontaje, patrón de `useEmparejamiento`).
 * - `estado === "finalizado"` → captura `res.resultado` y PARA el poll. El
 *   backend es ESTABLE (D6): el resultado no se consume, pero de este lado
 *   no hace falta seguir consultando.
 * - Otros estados (`esperando`/`emparejado`/`null`/transiciones de espera) →
 *   el duelo sigue: el juego se juega igual y el poll detecta el corte.
 * - Errores de red → se reintentan en el próximo tick (nunca romper el juego).
 * - `finalizar(res)` cubre la terminación síncrona: jugada que cortó (D3) o
 *   abandono (D4) — el resultado llega en la respuesta y se muestra al toque.
 */
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

  // Cleanup en desmontaje (patrón de hooks del proyecto).
  useEffect(() => () => limpiar(), []);

  const arrancar = useCallback(
    (codigo: string) => {
      // Idempotente: ya hay un poll corriendo para este código.
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
          const res = await emparejamientosApi.estado();
          // Mientras está emparejado el payload trae el rival — queda para el
          // copy del abandono (D12) y para el marcador del resultado. AMEND
          // CAMBIO 2: `rival_palabras` alimenta el "n" del rival en el
          // marcador "[J1] n/m [J2] n/m" (normalizado por requester).
          if (res.estado === "emparejado") {
            if (res.rival != null) setRival(res.rival);
            if (res.rival_palabras != null) setRivalContador(res.rival_palabras);
          }
          // Finalizado es ESTABLE (D6): el resultado persiste en backend, así
          // que capturarlo una vez es suficiente (idempotente por `finalizar`).
          if (res.estado === "finalizado" && res.resultado != null) {
            finalizar(res.resultado);
          }
          // esperando/emparejado/null (y cancelado/expirado, que no aplican
          // a un duelo en curso): el juego sigue; el próximo tick decide.
        } catch (e) {
          // Un poll fallido no rompe la partida: se reintenta en el próximo
          // tick (mismo criterio que useEmparejamiento).
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