/**
 * Copy de la pantalla de resultado del duelo 1v1 (C-19, D11/D13 + C-25, D5).
 *
 * Lógica PURA: `tituloResultado`/`subtituloResultado` devuelven el copy exacto
 * del design.md — ganador festivo 🥳🎉, perdedor sobrio, empate neutral. El
 * subtítulo recibe el `rival` aparte porque el componente puede pasarlo con
 * fallback (D11) y así el copy no depende de que el payload lo traiga.
 *
 * C-25 (D5): el subtítulo abre por `(gane, motivo)`:
 *   - `corte` → copy del C-19 (es HONESTO: el ganador por corte completó el
 *     total y siempre tiene más palabras que el rival — matemáticamente).
 *   - `abandono` → copy propio: "X abandonó el duelo. ¡Ganaste igual!" (gané
 *     por forfeit) / "Abandonaste el duelo. La revancha es otra partida."
 *     (perdí por mi abandono — RN-EM-07: el forfait lo gana quien completa el
 *     total aunque el rival lleve MÁS palabras; el copy del C-19 MENTÍA ahí).
 *   - `empate` → copy neutral.
 *
 * D6 (ventana de deploy): si `motivo` no viene (backend viejo) se deriva por
 * comparación de palabras — con el corte el ganador SIEMPRE tiene más, así
 * que `gane: true` con yo <= rival solo pudo ser abandono.
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

/** D6: deriva el `motivo` por comparación de palabras cuando el backend viejo
 * no lo trae. Corte ⟹ ganador con más palabras (contador == total vs rival <
 * total); cualquier otra combinación en un duelo decidido solo pudo ser
 * abandono. Empate ⟹ `gane: null`. */
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
  // D6: `motivo` requerido (D4) pero el backend viejo puede no traerlo durante
  // la ventana de deploy → se deriva por palabras.
  const motivo = resultado.motivo ?? motivoSinCampo(resultado);

  // Empate (o motivo "empate" en un gane decidido — rama defensiva de D5):
  // copy neutral siempre.
  if (resultado.gane === null || motivo === "empate") {
    return "¡Qué parejo! Igual cantidad de palabras.";
  }

  if (motivo === "abandono") {
    return resultado.gane
      ? `${rival} abandonó el duelo. ¡Ganaste igual!`
      : "Abandonaste el duelo. La revancha es otra partida.";
  }

  // Corte: copy honesto del C-19 — el ganador completó el total y tiene más.
  return resultado.gane
    ? `Encontraste más palabras que ${rival}. ¡No para cualquiera!`
    : `${rival} encontró más palabras que vos. La revancha es otra partida.`;
}