import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { partidasApi } from "../../../api/partidas";
import type { EditorPalabra, OrientacionCrucigrama } from "../../../types";
import { GrillaEditor } from "./GrillaEditor";
import { PalabraDraggable } from "./PalabraDraggable";
import { botonFinalizarAuto, type Colocada } from "./logica";

interface EditorCrucigramaProps {
  codigo: string;
  /** Se invoca cuando finalizar parte: el padre refresca la partida. */
  onFinalizada?: () => void;
}

/**
 * Contenedor del editor manual de crucigrama (C-09). Fuente de verdad local:
 * GET /partidas/{codigo}/editor (posiciones SIEMPRE visibles, solo creador).
 * El alta de posición es PUT optimista (D7): si el servidor rechaza (400),
 * se restaura el snapshot previo y se muestra el error del backend.
 */
export function EditorCrucigrama({ codigo, onFinalizada }: EditorCrucigramaProps) {
  const [palabras, setPalabras] = useState<EditorPalabra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [arrastre, setArrastre] = useState<{
    palabraId: string;
    palabra: string;
    orientacion: OrientacionCrucigrama;
  } | null>(null);
  const [orientaciones, setOrientaciones] = useState<Record<string, OrientacionCrucigrama>>({});
  const [finalizada, setFinalizada] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const editor = await partidasApi.obtenerEditorPartida(codigo);
      setPalabras(editor.palabras);
      setFinalizada(editor.estado !== "creando");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el editor.");
    } finally {
      setCargando(false);
    }
  }, [codigo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const colocadas = useMemo<Colocada[]>(
    () =>
      palabras.flatMap((p) => {
        if (!p.posicion) return [];
        return [
          {
            palabra: p.palabra,
            posicion: { fila: p.posicion.fila, columna: p.posicion.columna },
            orientacion: p.posicion.orientacion,
          },
        ];
      }),
    [palabras],
  );

  const posicionadas = colocadas.length;
  const total = palabras.length;
  // C-11 (defecto QA): con 0 posicionadas el backend genera la grilla
  // automáticamente (todas o ninguna — parcial responde 400). Sin el camino
  // automático el creador quedaba atrapado en "creando" para siempre.
  const mostrarFinalizarAuto = botonFinalizarAuto(posicionadas, total);

  function toggleOrientacion(palabraId: string) {
    setOrientaciones((prev) => ({
      ...prev,
      [palabraId]: prev[palabraId] === "H" ? "V" : "H",
    }));
  }

  function manejarDragStart(
    _e: DragEvent<HTMLDivElement>,
    palabraId: string,
    orientacion: OrientacionCrucigrama,
  ) {
    const palabra = palabras.find((p) => p.id === palabraId);
    if (!palabra) return;
    setArrastre({ palabraId, palabra: palabra.palabra, orientacion });
  }

  async function colocarPalabra(
    palabraId: string,
    orientacion: OrientacionCrucigrama,
    fila: number,
    columna: number,
  ) {
    setCargandoAccion(true);
    setError(null);
    const previo = palabras;
    setPalabras((actual) =>
      actual.map((p) =>
        p.id === palabraId ? { ...p, posicion: { fila, columna, orientacion } } : p,
      ),
    );
    try {
      const actualizada = await partidasApi.posicionarPalabra(codigo, palabraId, {
        fila,
        columna,
        orientacion,
      });
      setPalabras((actual) =>
        actual.map((p) => (p.id === palabraId ? actualizada : p)),
      );
    } catch (err) {
      // Rollback (D7): el servidor es la autoridad; restauramos el snapshot.
      setPalabras(previo);
      setError(
        err instanceof Error
          ? `El servidor rechazó la posición: ${err.message}`
          : "El servidor rechazó la posición.",
      );
    } finally {
      setCargandoAccion(false);
      setArrastre(null);
    }
  }

  async function quitarPalabra(palabraId: string) {
    setCargandoAccion(true);
    setError(null);
    const previo = palabras;
    // Optimista (D7): la palabra vuelve sin posición; si el servidor rechaza
    // (400/403/404) se restaura el snapshot y se muestra el error del backend.
    setPalabras((actual) =>
      actual.map((p) => (p.id === palabraId ? { ...p, posicion: null } : p)),
    );
    try {
      const actualizada = await partidasApi.quitarPosicionPalabra(codigo, palabraId);
      setPalabras((actual) =>
        actual.map((p) => (p.id === palabraId ? actualizada : p)),
      );
    } catch (err) {
      setPalabras(previo);
      setError(
        err instanceof Error
          ? `El servidor rechazó la operación: ${err.message}`
          : "El servidor rechazó la operación.",
      );
    } finally {
      setCargandoAccion(false);
    }
  }

  async function finalizar() {
    setCargandoAccion(true);
    setError(null);
    try {
      await partidasApi.finalizarPartida(codigo);
      onFinalizada?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo finalizar la partida.");
    } finally {
      setCargandoAccion(false);
    }
  }

  if (cargando) {
    return <p className="text-sm text-ink-soft">Cargando editor…</p>;
  }

  if (finalizada) {
    return (
      <p className="text-sm text-ink-soft">
        El crucigrama ya fue finalizado y no admite más ediciones.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </div>
      )}

      <GrillaEditor
        colocadas={colocadas}
        palabraArrastrada={arrastre}
        onColocarPalabra={(palabraId, orientacion, fila, columna) => {
          void colocarPalabra(palabraId, orientacion, fila, columna);
        }}
      />

      <div className="flex flex-col gap-3">
        <h3 className="font-display text-lg font-semibold text-ink">
          Palabras ({posicionadas} de {total} posicionadas)
        </h3>
        <ul className="flex flex-col gap-2">
          {palabras.map((p) => (
            <PalabraDraggable
              key={p.id}
              palabraId={p.id}
              texto={p.palabra}
              etiqueta={p.texto_mostrar ?? null}
              orientacion={orientaciones[p.id] ?? "H"}
              posicionada={p.posicion != null}
              onToggleOrientacion={toggleOrientacion}
              onDragStart={manejarDragStart}
              onQuitar={(palabraId) => {
                void quitarPalabra(palabraId);
              }}
            />
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => {
          void finalizar();
        }}
        disabled={posicionadas !== total || cargandoAccion}
        className="rounded-lg bg-coral px-4 py-2 font-semibold text-tile-light transition-colors hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cargandoAccion
          ? "Guardando…"
          : `Finalizar crucigrama (${posicionadas}/${total})`}
      </button>

      {mostrarFinalizarAuto && (
        <button
          type="button"
          onClick={() => {
            void finalizar();
          }}
          disabled={cargandoAccion}
          className="rounded-lg border border-ink-soft/40 px-4 py-2 font-semibold text-ink transition-colors hover:border-ink-soft/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargandoAccion
            ? "Guardando…"
            : "Finalizar y generar grilla automáticamente"}
        </button>
      )}
    </div>
  );
}