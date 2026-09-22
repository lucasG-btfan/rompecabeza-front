import type { ResultadoDuelo } from "../types/partidas";

export function tituloResultado(resultado: ResultadoDuelo): string {
  if (resultado.gane === true) {
    return "¡Ganaste el duelo! 🥳🎉";
  }
  if (resultado.gane === false) {
    return "Perdiste el duelo";
  }
  return "Empate";
}

function motivoSinCampo(resultado: ResultadoDuelo): ResultadoDuelo["motivo"] {
  if (resultado.gane === true) {
    return resultado.yo_palabras <= resultado.rival_palabras ? "abandono" : "corte";
  }
  if (resultado.gane === false) {
    return resultado.rival_palabras <= resultado.yo_palabras ? "abandono" : "corte";
  }
  return "empate";
}

export function subtituloResultado(resultado: ResultadoDuelo, rival: string): string {

  const motivo = resultado.motivo ?? motivoSinCampo(resultado);

  if (resultado.gane === null || motivo === "empate") {
    return "¡Qué parejo! Igual cantidad de palabras.";
  }

  if (motivo === "abandono") {
    return resultado.gane
      ? `${rival} abandonó el duelo. ¡Ganaste igual!`
      : "Abandonaste el duelo. La revancha es otra partida.";
  }

  return resultado.gane
    ? `Encontraste más palabras que ${rival}. ¡No para cualquiera!`
    : `${rival} encontró más palabras que vos. La revancha es otra partida.`;
}

export function tituloDueloExpirado(): string {
  return "El duelo expiró";
}

export function subtituloDueloExpirado(): string {
  return "El duelo superó el límite de una hora. La partida volvió al lobby.";
}