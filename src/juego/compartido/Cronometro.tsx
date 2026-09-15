import { useEffect, useState } from "react";
import { formatearTiempo, segundosTranscurridos } from "../../utils/tiempo";

/**
 * Cronómetro presentacional del juego (C-12, D2): muestra el tiempo
 * transcurrido desde `desde` en formato `mm:ss`.
 *
 * - `desde`: epoch ms. Para registrados lo setea el padre con el
 *   `iniciado_en` de su participación; para invitados con el timestamp de
 *   entrada a la partida (Jugar.tsx).
 * - Tick interno de 1s; la aritmética (`segundosTranscurridos`) y el
 *   formateo (`formatearTiempo`) son funciones puras de utils/tiempo (vitest),
 *   este componente solo orquesta el reloj.
 * - El reloj clampa a 0 si `desde` queda en el futuro (reloj del cliente
 *   adelantado): nunca muestra negativos.
 */

interface CronometroProps {
  /** Epoch ms del inicio de la partida. */
  desde: number;
}

export function Cronometro({ desde }: CronometroProps) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span>{formatearTiempo(segundosTranscurridos(desde, ahora))}</span>;
}