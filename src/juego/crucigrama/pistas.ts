import type {
  EstadoPalabra,
  GrillaCrucigrama,
  OrientacionCrucigrama,
  PalabraGrilla,
} from "../../types";

export type ClavePista = `${number}:${OrientacionCrucigrama}`;

export function clavePista(
  numero: number,
  orientacion: OrientacionCrucigrama,
): ClavePista {
  return `${numero}:${orientacion}`;
}

export interface PistasResueltas {
  porClave: Map<ClavePista, string>;
  pendientes: Map<number, EstadoPalabra[]>;
  colisiones: Set<number>;
}

export function resolverPistas(
  grilla: GrillaCrucigrama,
  estado: { palabras: EstadoPalabra[] },
): PistasResueltas {
  const porClave = new Map<ClavePista, string>();
  const pendientes = new Map<number, EstadoPalabra[]>();
  const colisiones = new Set<number>();

  const palabrasPorNumero = new Map<number, PalabraGrilla[]>();
  for (const w of grilla.palabras) {
    const lista = palabrasPorNumero.get(w.numero) ?? [];
    lista.push(w);
    palabrasPorNumero.set(w.numero, lista);
  }

  for (const p of estado.palabras) {
    if (p.numero == null) continue;
    const orientacion = p.posicion?.orientacion;
    if (orientacion === "H" || orientacion === "V") {
      porClave.set(clavePista(p.numero, orientacion), p.id);
      continue;
    }
    const lista = pendientes.get(p.numero) ?? [];
    lista.push(p);
    pendientes.set(p.numero, lista);
  }

  for (const [numero, lista] of pendientes) {
    const palabras = palabrasPorNumero.get(numero) ?? [];
    if (lista.length === 1 && palabras.length === 1) {
      porClave.set(clavePista(numero, palabras[0].orientacion), lista[0].id);
      pendientes.delete(numero);
    } else if (palabras.length >= 2 && lista.length >= 2) {
      colisiones.add(numero);
    }
  }

  return { porClave, pendientes, colisiones };
}


export function fusionarPistas(
  estaticas: PistasResueltas,
  cache: Map<ClavePista, string>,
): PistasResueltas {
  const porClave = new Map(estaticas.porClave);
  for (const [clave, id] of cache) porClave.set(clave, id);

  const idsResueltos = new Set(porClave.values());
  const pendientes = new Map<number, EstadoPalabra[]>();
  for (const [numero, lista] of estaticas.pendientes) {
    const restantes = lista.filter((p) => !idsResueltos.has(p.id));
    if (restantes.length > 0) pendientes.set(numero, restantes);
  }
  const colisiones = new Set<number>();
  for (const numero of estaticas.colisiones) {
    if (pendientes.has(numero)) colisiones.add(numero);
  }
  return { porClave, pendientes, colisiones };
}

export function idsCandidatos(
  pistas: PistasResueltas,
  palabra: PalabraGrilla,
): string[] {
  if (palabra.numero == null) return [];
  const directa = pistas.porClave.get(clavePista(palabra.numero, palabra.orientacion));
  if (directa != null) return [directa];
  const asignados = new Set(pistas.porClave.values());
  return (
    pistas.pendientes.get(palabra.numero)?.map((p) => p.id).filter((id) => !asignados.has(id)) ??
    []
  );
}

export type ResultadoPrueba =
  | "acierto"
  | "letrasIncorrectas"
  | "error";

export interface ResultadoPruebaCandidato {
  id: string;
  resultado: ResultadoPrueba;
}


export type DecisionValidacion =
  | {
      tipo: "acierto";
      id: string;
      cachear: boolean;
      descartados: string[];
    }
  | { tipo: "letrasIncorrectas"; cachear: false }
  | { tipo: "error"; cachear: false };

export async function resolverIdPorValidacion(
  candidatos: string[],
  probar: (id: string) => Promise<ResultadoPruebaCandidato>,
): Promise<DecisionValidacion> {
  if (candidatos.length === 0) return { tipo: "letrasIncorrectas", cachear: false };
  const descartados: string[] = [];
  for (const id of candidatos) {
    const { resultado } = await probar(id);
    if (resultado === "acierto") {
      return {
        tipo: "acierto",
        id,
        cachear: candidatos.length > 1,
        descartados,
      };
    }
    if (resultado === "error") {
      return { tipo: "error", cachear: false };
    }
    descartados.push(id);
  }
  return { tipo: "letrasIncorrectas", cachear: false };
}

export interface PistaPartida {
  palabras: { id: string; explicacion?: string | null }[];
}

export function explicacionDePalabra(
  pistas: PistasResueltas,
  partida: PistaPartida | null | undefined,
  palabra: PalabraGrilla,
): string | null {
  if (!partida || palabra.numero == null) return null;
  const candidatos = idsCandidatos(pistas, palabra);
  if (candidatos.length === 0) return null;
  const id = candidatos.length === 1 ? candidatos[0] : palabra.orientacion === "H" ? candidatos[0] : candidatos[1];
  return partida.palabras.find((p) => p.id === id)?.explicacion ?? null;
}