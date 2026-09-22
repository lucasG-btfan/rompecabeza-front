export interface DatoJugador {
  nombre: string | null;
  contador: number;
}

export function contadorAcotado(contador: number, total: number): number {
  return Math.max(0, Math.min(contador, total));
}

export function textoMarcadorDuelo(
  jugador1: DatoJugador,
  jugador2: DatoJugador,
  total: number,
): string {
  const etiqueta = (jugador: DatoJugador) =>
    `${jugador.nombre ?? "rival"} ${contadorAcotado(jugador.contador, total)}/${total}`;
  return `${etiqueta(jugador1)} ${etiqueta(jugador2)}`;
}