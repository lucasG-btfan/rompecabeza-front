import type { TipoPartida } from "../types";

export function etiquetaTipo(tipo: TipoPartida): string {
  return tipo === "crucigrama" ? "Crucigrama" : "Sopa de letras";
}