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
import { idsEncontrados } from "../compartido/progreso";
import type { EstadoPartida, Posicion, ResultadoDuelo } from "../../types";

interface SopaGameProps {
  codigo: string;
  estado: EstadoPartida;
  onPalabraEncontrada?: (
    palabraId: string,
    posicion?: Posicion | null,
    dueloFinalizado?: ResultadoDuelo | null,
  ) => void;
  onProgreso?: (encontradas: number, total: number) => void;
}

interface Seleccion {
  inicio: Celda;
  fin: Celda | null;
}

export function SopaGame({ codigo, estado, onPalabraEncontrada, onProgreso }: SopaGameProps) {
  const grilla: string[][] = Array.isArray(estado.grilla) ? estado.grilla : [];
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const arrastrando = useRef(false);
  const DRAG_THRESHOLD = 6;
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const hizoDrag = useRef(false);
  const inicioRef = useRef<Celda | null>(null);
  const finRef = useRef<Celda | null>(null);
  const encontradasIds = idsEncontrados(estado.palabras);

  const candidatas: PalabraCandidata[] = estado.palabras.map((p) => ({
    id: p.id,
    texto: (p.palabra ?? "").toUpperCase(),
    encontrada: encontradasIds.has(p.id),
  }));

  const celdasEncontradas = new Set<string>();
  for (const p of estado.palabras) {
    if (!encontradasIds.has(p.id)) continue;
    if (p.posicion) {
      for (const c of obtenerCeldasDePalabra(p.posicion, (p.palabra ?? "").length)) {
        celdasEncontradas.add(`${c.fila},${c.columna}`);
      }
    }
  }

  const celdasSeleccionadas =
    seleccion && seleccion.fin
      ? (obtenerCeldasLineales(seleccion.inicio, seleccion.fin) ?? [])
      : seleccion
        ? [seleccion.inicio]
        : [];

  function celdaBajoCursor(clientX: number, clientY: number): Celda | null {
    const grid = contenedorRef.current?.querySelector('[role="grid"]');
    if (!grid) return null;

    const numFilas = grilla.length;
    const numColumnas = grilla[0]?.length ?? 0;
    if (numFilas === 0 || numColumnas === 0) return null;

    const gridRect = grid.getBoundingClientRect();
    const primerCelda = grid.querySelector('[role="gridcell"]') as HTMLElement | null;
    if (!primerCelda) return null;
    const cellRect = primerCelda.getBoundingClientRect();
    const cellW = cellRect.width;
    const cellH = cellRect.height;

    const totalGapsX = gridRect.width - cellW * numColumnas;
    const gapX = numColumnas > 1 ? totalGapsX / (numColumnas - 1) : 0;
    const totalGapsY = gridRect.height - cellH * numFilas;
    const gapY = numFilas > 1 ? totalGapsY / (numFilas - 1) : 0;
   const x = clientX - gridRect.left;
    const y = clientY - gridRect.top;

    const stepX = cellW + gapX;
    const stepY = cellH + gapY;
    const col = Math.floor(x / stepX);
    const fila = Math.floor(y / stepY);

    const offsetX = x - col * stepX;
    const offsetY = y - fila * stepY;
    if (offsetX > cellW || offsetY > cellH) return null;

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
      onPalabraEncontrada?.(
        deduccion.palabraId,
        resultado.posicion,
        resultado.duelo_finalizado ?? null,
      );
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

    if (seleccion && seleccion.fin === null) {
      validar(seleccion.inicio, celda);
      return;
    }

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

    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      pointerDownPos.current = null; 
    }

    const celda = celdaBajoCursor(e.clientX, e.clientY);
    if (!celda) return;

    hizoDrag.current = true;
    finRef.current = celda;
    
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
      
    }

    if (hizoDrag.current && inicioRef.current && finRef.current) {
      const inicio = inicioRef.current;
      const fin = finRef.current;
      inicioRef.current = null;
      finRef.current = null;
      hizoDrag.current = false;
      validar(inicio, fin);
      return;
    }

    hizoDrag.current = false;
  }

  function estadoCelda(f: number, c: number): EstadoCelda {
    if (celdasEncontradas.has(`${f},${c}`)) return "encontrada";
    if (celdasSeleccionadas.some((x) => x.fila === f && x.columna === c)) return "seleccionada";
    return "normal";
  }

  const total = estado.palabras.length;
  const encontradas = encontradasIds.size;

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