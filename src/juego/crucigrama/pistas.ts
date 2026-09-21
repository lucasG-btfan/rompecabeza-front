/**
 * Resolución de pistas del crucigrama (c-21-fix-pistas-crucigrama, D2/D4).
 *
 * El bug QKL3K7: dos palabras H+V que inician en la MISMA celda comparten
 * número de pista, y el front las unía con `Map<number, string>` — la última
 * pisaba a la primera (pista duplicada, validación contra el id equivocado,
 * crucigrama imposible).
 *
 * Este módulo es el puente `(numero, orientacion)` → id de palabra. Operación
 * pura y determinista (sin red, sin BD): vive separado de `logica.ts`
 * (mecánica de juego: tablero, celdas, borrado) por responsabilidad — regla
 * dura 8 (límite de líneas por archivo).
 */

import type {
  EstadoPalabra,
  GrillaCrucigrama,
  OrientacionCrucigrama,
  PalabraGrilla,
} from "../../types";

/**
 * Clave compuesta B1 `(numero, orientacion)` del fix c-21 (D4): única POR
 * CONSTRUCCIÓN en la grilla — dos palabras solo comparten número de pista si
 * inician en la misma celda, y eso SOLO ocurre entre una H y una V (nunca dos
 * del mismo eje). Formato legible en debug: "9:H", "9:V".
 */
export type ClavePista = `${number}:${OrientacionCrucigrama}`;

/** Formatea la clave B1. Es la ÚNICA fuente del formato (D4): la usan el
 *  hook, el teclado y el panel para no duplicar el separador. */
export function clavePista(
  numero: number,
  orientacion: OrientacionCrucigrama,
): ClavePista {
  return `${numero}:${orientacion}`;
}

/**
 * Resolución ESTÁTICA de pistas (c-21, D2.1): puente `(numero, orientacion)`
 * → id de la palabra. Reemplaza (mejorándolo) el viejo `Map<number, string>`
 * de `useCrucigramaJuego`, que pisaba una de las dos palabras de un par
 * colisionante (H+V iniciando en la misma celda, mismo numero).
 *
 * El contrato C-14 NO revela la orientacion de cada `EstadoPalabra`
 * (`encontrada=False, posicion=None` fijos en deps.py:91-100), así que el
 * armado opera en dos planos:
 *   1. `porClave` — claves resueltas de forma DETERMINISTA: por
 *      `posicion.orientacion` cuando viaja (camino que el backend hoy no usa,
 *      disponible si algún día lo revela) o por EXCLUSIÓN cuando el numero es
 *      único en la grilla.
 *   2. `pendientes` + `colisiones` — pares H+V irresolubles estáticamente:
 *      quedan pendientes (sus 2 ids candidatos disponibles) y marcados como
 *      colisión para que el plano dinámico (validación con caché) los
 *      resuelva en runtime.
 *
 * NUNCA usa el orden de `estado.palabras` como señal de desambiguación (no
 * es parte del contrato).
 */
export interface PistasResueltas {
  /** Clave resuelta → id de la palabra. */
  porClave: Map<ClavePista, string>;
  /** Numeros de pista con EstadoPalabra(s) sin resolver (0..2 por numero). */
  pendientes: Map<number, EstadoPalabra[]>;
  /** Numeros con un par colisionante (H+V) sin resolver estáticamente. */
  colisiones: Set<number>;
}

export function resolverPistas(
  grilla: GrillaCrucigrama,
  estado: { palabras: EstadoPalabra[] },
): PistasResueltas {
  const porClave = new Map<ClavePista, string>();
  const pendientes = new Map<number, EstadoPalabra[]>();
  const colisiones = new Set<number>();

  // Palabras de la grilla por numero (para el match por exclusión).
  const palabrasPorNumero = new Map<number, PalabraGrilla[]>();
  for (const w of grilla.palabras) {
    const lista = palabrasPorNumero.get(w.numero) ?? [];
    lista.push(w);
    palabrasPorNumero.set(w.numero, lista);
  }

  // Primer plano: señales estáticas de cada EstadoPalabra.
  for (const p of estado.palabras) {
    if (p.numero == null) continue;
    const orientacion = p.posicion?.orientacion;
    if (orientacion === "H" || orientacion === "V") {
      // Camino disponible si algún día el backend revela posicion.
      porClave.set(clavePista(p.numero, orientacion), p.id);
      continue;
    }
    const lista = pendientes.get(p.numero) ?? [];
    lista.push(p);
    pendientes.set(p.numero, lista);
  }

  // Segundo plano: exclusión por número único contra la grilla D6.
  for (const [numero, lista] of pendientes) {
    const palabras = palabrasPorNumero.get(numero) ?? [];
    if (lista.length === 1 && palabras.length === 1) {
      // Numero único → el pendiente SE RESUELVE por exclusión.
      porClave.set(clavePista(numero, palabras[0].orientacion), lista[0].id);
      pendientes.delete(numero);
    } else if (palabras.length >= 2 && lista.length >= 2) {
      // Par H+V con el mismo inicio → colisión irresoluble estáticamente.
      colisiones.add(numero);
    }
  }

  return { porClave, pendientes, colisiones };
}

/**
 * Fondo dinámico del armado (c-21, D4): fusiona la resolución ESTÁTICA con el
 * caché de la sesión (pares resueltos por validación en runtime).
 *
 * - Hace valer el caché: cada clave/par resuelto dinámicamente deja de estar
 *   pendiente (un id solo puede pertenecer a UNA palabra).
 * - `colisiones` solo marca lo que SIGUE sin resolver (el par ya resuelto se
 *   desmarca).
 * Pura y sin estado: el hook la usa dentro de un `useMemo([grilla, estado,
 * cachePistas])`.
 */
export function fusionarPistas(
  estaticas: PistasResueltas,
  cache: Map<ClavePista, string>,
): PistasResueltas {
  const porClave = new Map(estaticas.porClave);
  for (const [clave, id] of cache) porClave.set(clave, id);

  // Pendientes/colisiones solo reflejan lo que SIGUE sin resolver: el par
  // cacheado desaparece de ambos.
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

/**
 * Candidatos de validación para UNA palabra de la grilla (c-21, D2.2):
 * los ids de `EstadoPalabra` que pueden corresponderle.
 *
 *   1. Clave `(numero, orientacion)` resuelta → ese ÚNICO id (cache manda).
 *   2. Sin resolver → los `pendientes[numero]`: 0..2 candidatos.
 *
 * Devuelve `[]` cuando no hay señal (defensivo: numero null o pendiente
 * vacío) — el llamador decide cómo tratar la ausencia de candidatos.
 */
export function idsCandidatos(
  pistas: PistasResueltas,
  palabra: PalabraGrilla,
): string[] {
  if (palabra.numero == null) return [];
  const directa = pistas.porClave.get(clavePista(palabra.numero, palabra.orientacion));
  if (directa != null) return [directa];
  // ids YA asignados (cache parcial: el par se resolvió de a una clave) NO
  // pueden ser candidatos de la otra palabra (un id pertenece a UNA sola).
  const asignados = new Set(pistas.porClave.values());
  return (
    pistas.pendientes.get(palabra.numero)?.map((p) => p.id).filter((id) => !asignados.has(id)) ??
    []
  );
}

/** Resultado de "probar" un candidato contra el backend (200/400/otro). */
export type ResultadoPrueba =
  /** 200: las letras coinciden con la palabra de ese id. */
  | "acierto"
  /** 400: "Letras incorrectas" — el id existe pero las letras no coinciden. */
  | "letrasIncorrectas"
  /** otro status/código (500, red): abortar, no se puede desambiguar así. */
  | "error";

export interface ResultadoPruebaCandidato {
  id: string;
  resultado: ResultadoPrueba;
}

/**
 * Decisión de validación de UNA palabra (c-21, D2.2): dado el conjunto de
 * candidatos y un probe inyectado del backend, decide QUÉ id validar y SI
 * cachear la resolución. ALGORITMO PURo: no toca red ni estado — el hook
 * inyecta `probar` y aplica el resultado sobre `porClave`.
 */
export type DecisionValidacion =
  | {
      /** Un candidato respondió 200: gana; el resto queda descartado. */
      tipo: "acierto";
      id: string;
      /**
       * true si la resolución es nueva (par no resuelto antes: hubo >1
       * candidato) → el hook cachea id + descartados. false si había 1 solo
       * candidato (ya resuelto estáticamente: nada nuevo que cachear).
       */
      cachear: boolean;
      /** Candidatos que respondieron 400 ANTES del acierto (hermano del par
       *  por exclusión: también queda identificado con el mismo viaje). */
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

/** Porción de `Partida` que la resolución de pistas necesita (id + texto
 *  público). Estructural para no acoplar la lógica pura al contrato completo. */
export interface PistaPartida {
  palabras: { id: string; explicacion?: string | null }[];
}

/**
 * Texto de pista para UNA palabra de la grilla (c-21, D2.3): resuelve el id
 * por `idsCandidatos` y devuelve su explicacion. Nunca por numero (eso pisa
 * una de las dos pistas de un par colisionante).
 *
 * - 1 solo candidato ⇒ el id es SEGURO → su explicacion.
 * - par pendiente (2 candidatos) ⇒ id PROVISIONAL estable por orientacion:
 *   H toma candidatos[0] y V candidatos[1]. El TEXTO queda único en su numero
 *   (nunca "—" ni duplicado): cuando el par se resuelva por validación el
 *   caché lo corrige a la correspondencia real.
 * - sin candidatos o sin partida ⇒ null.
 */
export function explicacionDePalabra(
  pistas: PistasResueltas,
  partida: PistaPartida | null | undefined,
  palabra: PalabraGrilla,
): string | null {
  if (!partida || palabra.numero == null) return null;
  const candidatos = idsCandidatos(pistas, palabra);
  if (candidatos.length === 0) return null;
  // Provisional estable por orientacion para pares pendientes (D2.3):
  const id = candidatos.length === 1 ? candidatos[0] : palabra.orientacion === "H" ? candidatos[0] : candidatos[1];
  return partida.palabras.find((p) => p.id === id)?.explicacion ?? null;
}