import { useEffect, useRef, useState } from "react";
import { Tablero } from "../compartido/Tablero";
import { CeldaSopa, type EstadoCelda } from "./Celda";
import {
  deducirPalabra,
  obtenerCeldasDePalabra,
  obtenerCeldasLineales,
  type Celda,
  type PalabraCandidata,
} from "./logica";
import { partidasApi } from "../../api/partidas";
import type { EstadoPartida, Posicion } from "../../types";

interface SopaGameProps {
  codigo: string;
  estado: EstadoPartida;
  /** Si el jugador no tiene cuenta (invitado): su progreso va por localStorage,
   * no por el backend (que no persiste nada para invitados). */
  esInvitado?: boolean;
  /** Se dispara cuando una palabra se marca encontrada (para actualizar la screen). */
  onPalabraEncontrada?: (palabraId: string) => void;
  /** Informa el progreso REAL del jugador (encontradas, total), combinando back
   * y localStorage del invitado, para que la pantalla madre muestre el contador. */
  onProgreso?: (encontradas: number, total: number) => void;
}

interface Seleccion {
  inicio: Celda;
  fin: Celda | null;
}

/** Hallazgo del invitado guardado en localStorage: id + posición (para resaltar). */
interface HallazgoLocal {
  id: string;
  posicion: Posicion | null;
}

/** Clave de localStorage con el progreso del invitado, por partida. */
function claveProgreso(codigo: string) {
  return `sopa_progreso_${codigo}`;
}

function leerProgresoLocal(codigo: string): HallazgoLocal[] {
  try {
    const raw = localStorage.getItem(claveProgreso(codigo));
    const arr = raw ? (JSON.parse(raw) as HallazgoLocal[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function guardarProgresoLocal(codigo: string, hallazgos: HallazgoLocal[]) {
  try {
    localStorage.setItem(claveProgreso(codigo), JSON.stringify(hallazgos));
  } catch {
    // localStorage puede no estar disponible (modo privado/errores); el juego
    // sigue funcionando, solo no se persiste el progreso del invitado.
  }
}

/**
 * Juego de Sopa de Letras.
 *
 * El progreso es POR JUGADOR:
 * - Jugador registrado: el backend le devuelve SOLO las palabras que esa cuenta
 *   encontró (progreso propio).
 * - Invitado: el backend no persiste nada, así que su progreso vive en
 *   localStorage y se combina con el estado para resaltar sus hallazgos.
 *
 * FORMAS DE SELECCIONAR:
 * - Arrastrando el mouse/dedo, o
 * - click en inicio + click en fin (modo click→click).
 *
 * El arrastre se maneja a nivel del CONTENEDOR de la grilla (no por celda):
 * el pointerdown captura el puntero en el contenedor y, en cada pointermove,
 * se calcula la celda bajo el cursor con `elementFromPoint`. Esto evita los
 * problemas de drag nativo de los <button> individuales (el implicit pointer
 * capture de touch-action: none rompía el pointerenter por celda).
 */
export function SopaGame({ codigo, estado, esInvitado = false, onPalabraEncontrada, onProgreso }: SopaGameProps) {
  const grilla = estado.grilla ?? [];
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Ref del contenedor donde capturamos el puntero durante el arrastre.
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const arrastrando = useRef(false);

  // Progreso del invitado (solo se usa si esInvitado).
  const [progresoLocal, setProgresoLocal] = useState<HallazgoLocal[]>(() =>
    esInvitado ? leerProgresoLocal(codigo) : [],
  );

  // Cuando cambia el código (otra partida) y el jugador es invitado, recargamos
  // su progreso local para esa partida.
  useEffect(() => {
    if (esInvitado) {
      setProgresoLocal(leerProgresoLocal(codigo));
    }
  }, [codigo, esInvitado]);

  // Palabras encontradas por ESTE jugador: las del backend (registrado) más,
  // si es invitado, las de su localStorage.
  const encontradasLocales = new Map(
    progresoLocal.map((h) => [h.id, h.posicion]),
  );
  const encontradasIds = new Set<string>();
  for (const p of estado.palabras) {
    if (p.encontrada || encontradasLocales.has(p.id)) {
      encontradasIds.add(p.id);
    }
  }

  const candidatas: PalabraCandidata[] = estado.palabras.map((p) => ({
    id: p.id,
    texto: p.palabra.toUpperCase(),
    encontrada: encontradasIds.has(p.id),
  }));

  // Celdas a resaltar como "encontradas": para registrados usamos la posición
  // que devuelve el back; para invitados, la posición guardada en localStorage.
  const celdasEncontradas = new Set<string>();
  for (const p of estado.palabras) {
    if (!encontradasIds.has(p.id)) continue;
    const posicion = p.posicion ?? encontradasLocales.get(p.id) ?? null;
    if (posicion) {
      for (const c of obtenerCeldasDePalabra(posicion, p.palabra.length)) {
        celdasEncontradas.add(`${c.fila},${c.columna}`);
      }
    }
  }

  // Celdas en la línea seleccionada (en vivo durante el arrastre).
  const celdasSeleccionadas =
    seleccion && seleccion.fin
      ? (obtenerCeldasLineales(seleccion.inicio, seleccion.fin) ?? [])
      : seleccion
        ? [seleccion.inicio]
        : [];

  /** Lee la celda bajo el cursor en coordenadas de la grilla, o null si el
   * puntero está fuera del tablero. Usa elementFromPoint para no saltar celdas
   * aunque el mouse se mueva rápido. */
  function celdaBajoCursor(clientX: number, clientY: number): Celda | null {
    const el = document.elementFromPoint(clientX, clientY);
    const celdaEl = el?.closest("[data-fila]") as HTMLElement | null;
    if (!celdaEl) return null;
    const fila = Number(celdaEl.dataset.fila);
    const columna = Number(celdaEl.dataset.col);
    if (Number.isNaN(fila) || Number.isNaN(columna)) return null;
    if (fila >= grilla.length || columna >= (grilla[0]?.length ?? 0)) return null;
    return { fila, columna };
  }

  async function validar(inicio: Celda, fin: Celda) {
    if (enviando) return;
    setEnviando(true);
    try {
      const deduccion = deducirPalabra(candidatas, grilla, inicio, fin);
      if (!deduccion) {
        setError("Esa selección no corresponde a ninguna palabra.");
        return;
      }
      const resultado = await partidasApi.marcarEncontrada(codigo, deduccion.palabraId, {
        fila_inicio: inicio.fila,
        columna_inicio: inicio.columna,
        fila_fin: fin.fila,
        columna_fin: fin.columna,
      });
      if (!resultado.encontrada) {
        setError("Esa selección no corresponde a ninguna palabra.");
        return;
      }
      setError(null);

      // Invitado: persisto el hallazgo en localStorage (el back no lo guarda).
      if (esInvitado) {
        const hallazgo = { id: deduccion.palabraId, posicion: resultado.posicion ?? null };
        setProgresoLocal((prev) => {
          if (prev.some((h) => h.id === hallazgo.id)) return prev;
          const sig = [...prev, hallazgo];
          guardarProgresoLocal(codigo, sig);
          return sig;
        });
      }

      onPalabraEncontrada?.(deduccion.palabraId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo validar la selección.");
    } finally {
      setEnviando(false);
      setSeleccion(null);
    }
  }

  function manejarPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (enviando) return;
    setError(null);

    const celda = celdaBajoCursor(e.clientX, e.clientY);
    if (!celda) return;

    // Ya hay una selección abierta (inicio sin fin): es el 2º click del modo
    // click→click. Cerramos seleccionando la celda actual y validamos.
    if (seleccion && seleccion.fin === null) {
      validar(seleccion.inicio, celda);
      return;
    }

    // Empieza una nueva selección. Capturamos el puntero EN EL CONTENEDOR para
    // recibir todos los pointermove/up aunque el cursor salga del tablero.
    arrastrando.current = true;
    contenedorRef.current?.setPointerCapture(e.pointerId);
    setSeleccion({ inicio: celda, fin: null });
  }

  function manejarPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!arrastrando.current || enviando) return;
    const celda = celdaBajoCursor(e.clientX, e.clientY);
    if (!celda) return;
    setSeleccion((sel) => {
      if (!sel || sel.fin !== null) return sel;
      return { inicio: sel.inicio, fin: celda };
    });
  }

  function manejarPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!arrastrando.current) return;
    arrastrando.current = false;
    try {
      contenedorRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // releasePointerCapture puede fallar si la captura ya se liberó sola.
    }
    // Si arrastramos hasta una celda final, cerramos y validamos.
    if (seleccion && seleccion.fin) {
      validar(seleccion.inicio, seleccion.fin);
      setSeleccion(null);
    }
    // Si fin quedó null (click simple sin arrastre), la selección queda abierta
    // esperando el 2º click, que se resolverá en el próximo pointerdown.
  }

  function estadoCelda(f: number, c: number): EstadoCelda {
    if (celdasEncontradas.has(`${f},${c}`)) return "encontrada";
    if (celdasSeleccionadas.some((x) => x.fila === f && x.columna === c)) return "seleccionada";
    return "normal";
  }

  const total = estado.palabras.length;
  const encontradas = encontradasIds.size;

  // Informamos el progreso real hacia la pantalla madre (para el contador y el
  // banner "completaste"), incluyendo el progreso local del invitado.
  useEffect(() => {
    onProgreso?.(encontradas, total);
  }, [encontradas, total, onProgreso]);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div
        ref={contenedorRef}
        onPointerDown={manejarPointerDown}
        onPointerMove={manejarPointerMove}
        onPointerUp={manejarPointerUp}
        className="select-none touch-none"
      >
        <Tablero
          filas={grilla.length}
          columnas={grilla[0]?.length ?? 0}
          renderCelda={(fila, columna) => (
            <CeldaSopa
              letra={grilla[fila]?.[columna] ?? ""}
              fila={fila}
              columna={columna}
              estado={estadoCelda(fila, columna)}
            />
          )}
        />
      </div>

      {error && (
        <p className="max-w-sm text-center text-sm text-coral">{error}</p>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {estado.palabras.map((p) => (
          <span
            key={p.id}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              encontradasIds.has(p.id)
                ? "bg-amber text-ink"
                : "border border-line/30 text-ink-soft"
            }`}
          >
            {p.palabra}
          </span>
        ))}
      </div>
    </div>
  );
}
