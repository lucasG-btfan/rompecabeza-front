/**
 * Copy de la pantalla de resultado del duelo 1v1 (C-19, D11/D13).
 *
 * Lógica PURA: `tituloResultado`/`subtituloResultado` devuelven el copy exacto
 * del design.md — ganador festivo 🥳🎉, perdedor sobrio, empate neutral. El
 * subtítulo recibe el `rival` aparte porque el componente puede pasarlo con
 * fallback (D11) y así el copy no depende de que el payload lo traiga.
 *
 * NO cambiar textos sin cambiar el design.md (D11) — están verificados por
 * `resultadoDuelo.test.ts`.
 */

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

export function subtituloResultado(resultado: ResultadoDuelo, rival: string): string {
  if (resultado.gane === true) {
    return `Encontraste más palabras que ${rival}. ¡No para cualquiera!`;
  }
  if (resultado.gane === false) {
    return `${rival} encontró más palabras que vos. La revancha es otra partida.`;
  }
  return "¡Qué parejo! Igual cantidad de palabras.";
}