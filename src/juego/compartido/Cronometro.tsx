import { useEffect, useState } from "react";
import { formatearTiempo, segundosTranscurridos } from "../../utils/tiempo";


interface CronometroProps {
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