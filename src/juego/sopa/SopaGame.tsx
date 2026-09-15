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
  onPalabraEncontrada?: (palabraId: string, posicion?: Posicion | null) => void;
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

export function SopaGame({ codigo, estado, esInvitado = false, onPalabraEncontrada, onProgreso }: SopaGameProps) {
  // La rama sopa SIEMPRE recibe `grilla` como string[][] (el backend mantiene
  // la grilla de sopa como matriz). El tipo del estado es una unión con
  // `GrillaCrucigrama` (partidas de crucigrama, C-10): narrow con Array.isArray
  // y, defensivo, caer a grilla vacía si viniera el objeto por error.
  const grilla: string[][] = Array.isArray(estado.grilla) ? estado.grilla : [];
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Ref del contenedor donde capturamos el puntero durante el arrastre.
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const arrastrando = useRef(false);
  // Umbral en px: por debajo de este movimiento, el pointerup se trata como
  // click quieto (no drag). Absorbe el micro-jitter del mouse al hacer click.
  const DRAG_THRESHOLD = 6;
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const hizoDrag = useRef(false);
  // Espejo sincrónico de la selección para validar en pointerup. El último
  // pointermove puede no haber commiteado en React cuando llega el pointerup
  // (mismo frame), y el closure de `seleccion` quedaría desactualizado.
  const inicioRef = useRef<Celda | null>(null);
  const finRef = useRef<Celda | null>(null);

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
    // Para sopa el backend siempre manda `palabra` (en crucigrama va null por
    // anti-cheat, C-10). El `?? ""` solo satisface el tipo sin cambiar runtime.
    texto: (p.palabra ?? "").toUpperCase(),
    encontrada: encontradasIds.has(p.id),
  }));

  // Celdas a resaltar como "encontradas": para registrados usamos la posición
  // que devuelve el back; para invitados, la posición guardada en localStorage.
  const celdasEncontradas = new Set<string>();
  for (const p of estado.palabras) {
    if (!encontradasIds.has(p.id)) continue;
    const posicion = p.posicion ?? encontradasLocales.get(p.id) ?? null;
    if (posicion) {
      // `?? ""`: ver nota en `candidatas` (sopa nunca recibe null en runtime).
      for (const c of obtenerCeldasDePalabra(posicion, (p.palabra ?? "").length)) {
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


  /**
   * Determina qué celda de la grilla está bajo las coordenadas del viewport,
   * usando pura geometría (sin elementFromPoint, sin data-* attributes).
   *
   * La grilla usa CSS Grid con celdas de tamaño fijo (h-9/w-9 o sm:h-11/sm:w-11)
   * y gap uniforme (gap-1 = 4px). Con el rect del grid y el tamaño de la
   * primera celda, podemos mapear cualquier coordenada del viewport a una celda.
   */
  function celdaBajoCursor(clientX: number, clientY: number): Celda | null {
    const grid = contenedorRef.current?.querySelector('[role="grid"]');
    if (!grid) return null;

    const numFilas = grilla.length;
    const numColumnas = grilla[0]?.length ?? 0;
    if (numFilas === 0 || numColumnas === 0) return null;

    const gridRect = grid.getBoundingClientRect();

    // Tamaño de la primera celda real (respeta responsive: 36px mobile, 44px sm+)
    const primerCelda = grid.querySelector('[role="gridcell"]') as HTMLElement | null;
    if (!primerCelda) return null;
    const cellRect = primerCelda.getBoundingClientRect();
    const cellW = cellRect.width;
    const cellH = cellRect.height;

    // Gap real calculado del grid (funciona para cualquier valor de gap)
    const totalGapsX = gridRect.width - cellW * numColumnas;
    const gapX = numColumnas > 1 ? totalGapsX / (numColumnas - 1) : 0;
    const totalGapsY = gridRect.height - cellH * numFilas;
    const gapY = numFilas > 1 ? totalGapsY / (numFilas - 1) : 0;

    // Coordenadas relativas al inicio del grid
    const x = clientX - gridRect.left;
    const y = clientY - gridRect.top;

    // Celda bajo el cursor: cada celda ocupa cellW + gapX de espacio.
    const stepX = cellW + gapX;
    const stepY = cellH + gapY;
    const col = Math.floor(x / stepX);
    const fila = Math.floor(y / stepY);

    // Verificar que estamos dentro de una celda (no en el gap entre celdas)
    const offsetX = x - col * stepX;
    const offsetY = y - fila * stepY;
    if (offsetX > cellW || offsetY > cellH) return null;

    // Verificar límites de la grilla
    if (fila < 0 || fila >= numFilas || col < 0 || col >= numColumnas) return null;

    return { fila, columna: col };
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

      // Registrado: propagamos la posición que devolvió el back para que la
      // grilla resalte la palabra en vivo (el estado inicial la trae null
      // hasta que este jugador la encuentra — anti-revelación, ver back).
      onPalabraEncontrada?.(deduccion.palabraId, resultado.posicion);
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
    // click→click. Validamos inicio→celda actual y cerramos.
    if (seleccion && seleccion.fin === null) {
      validar(seleccion.inicio, celda);
      return;
    }

    // Nueva selección. Capturamos el puntero EN EL CONTENEDOR para seguir
    // recibiendo pointermove/up aunque el cursor salga del tablero.
    arrastrando.current = true;
    hizoDrag.current = false;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    inicioRef.current = celda;
    finRef.current = null;
    contenedorRef.current?.setPointerCapture(e.pointerId);
    setSeleccion({ inicio: celda, fin: null });
  }

  function manejarPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!arrastrando.current || enviando) return;

    // Ignoramos el micro-jitter del click: hasta que el cursor no se mueva más
    // de DRAG_THRESHOLD px desde el pointerdown, esto NO es un drag.
    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      pointerDownPos.current = null; // umbral superado: ya no volvemos a chequear
    }

    const celda = celdaBajoCursor(e.clientX, e.clientY);
    if (!celda) return;

    hizoDrag.current = true;
    finRef.current = celda;
    // El fin se actualiza SIEMPRE: la selección sigue al cursor en vivo,
    // horizontal, vertical o diagonal (obtenerCeldasLineales ya las soporta).
    setSeleccion((sel) => {
      if (!sel) return sel;
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

    // ¿Hubo un drag real? Validamos con las refs (sincrónicas, inmunes a
    // renders pendientes).
    if (hizoDrag.current && inicioRef.current && finRef.current) {
      const inicio = inicioRef.current;
      const fin = finRef.current;
      inicioRef.current = null;
      finRef.current = null;
      hizoDrag.current = false;
      validar(inicio, fin);
      return;
    }

    // Click quieto (movimiento < umbral): NO tocamos la selección. Queda
    // abierta con fin = null esperando el 2º click del modo click→click.
    hizoDrag.current = false;
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
            {p.texto_mostrar ?? p.palabra}
          </span>
        ))}
      </div>
    </div>
  );
}
