import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { partidasApi } from "../api/partidas";
import type { Partida } from "../types";

export function EditarPartida() {
  const { codigo = "" } = useParams();
  const navigate = useNavigate();

  const [partida, setPartida] = useState<Partida | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevaPalabra, setNuevaPalabra] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoTexto, setEditandoTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [cargandoAccion, setCargandoAccion] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const p = await partidasApi.obtenerPartida(codigo);
      setPartida(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la partida.");
    } finally {
      setCargando(false);
    }
  }, [codigo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function agregarPalabra(e: FormEvent) {
    e.preventDefault();
    // Quitamos espacios internos y pasamos a mayúsculas: en la sopa la palabra
    // no lleva espacio ("sr frio" se guarda y juega como "SRFRIO").
    const palabra = nuevaPalabra.toUpperCase().replace(/\s+/g, "");
    if (!palabra) return;
    setCargandoAccion(true);
    try {
      const nuevas = await partidasApi.agregarPalabras(codigo, [{ palabra }]);
      setPartida((prev) =>
        prev
          ? { ...prev, palabras: [...prev.palabras, ...nuevas] }
          : prev,
      );
      setNuevaPalabra("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la palabra.");
    } finally {
      setCargandoAccion(false);
    }
  }

  async function finalizar() {
    setCargandoAccion(true);
    setError(null);
    try {
      const res = await partidasApi.finalizarPartida(codigo);
      setPartida((prev) => (prev ? { ...prev, estado: res.estado } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo finalizar.");
    } finally {
      setCargandoAccion(false);
    }
  }

  async function eliminar() {
    if (!window.confirm("¿Seguro que querés eliminar esta partida? Esta acción no se puede deshacer.")) {
      return;
    }
    setCargandoAccion(true);
    try {
      await partidasApi.eliminarPartida(codigo);
      navigate("/mis-proyectos", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
      setCargandoAccion(false);
    }
  }

  async function eliminarPalabra(palabraId: string) {
    setCargandoAccion(true);
    setError(null);
    try {
      await partidasApi.eliminarPalabra(codigo, palabraId);
      setPartida((prev) =>
        prev ? { ...prev, palabras: prev.palabras.filter((p) => p.id !== palabraId) } : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la palabra.");
    } finally {
      setCargandoAccion(false);
    }
  }

  async function guardarEdicion(palabraId: string) {
    const palabra = editandoTexto.toUpperCase().replace(/\s+/g, "");
    if (!palabra) return;
    setCargandoAccion(true);
    setError(null);
    try {
      const actualizada = await partidasApi.editarPalabra(codigo, palabraId, { palabra });
      setPartida((prev) =>
        prev
          ? { ...prev, palabras: prev.palabras.map((p) => (p.id === palabraId ? actualizada : p)) }
          : prev,
      );
      setEditandoId(null);
      setEditandoTexto("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo editar la palabra.");
    } finally {
      setCargandoAccion(false);
    }
  }

  if (cargando) {
    return <p className="text-sm text-ink-soft">Cargando partida…</p>;
  }

  if (!partida) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-coral">{error ?? "Partida no encontrada."}</p>
        <Link to="/mis-proyectos" className="text-sm font-medium text-ink hover:underline">
          ← Volver a mis partidas
        </Link>
      </div>
    );
  }

  const yaFinalizada = partida.estado !== "creando";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Editar partida</h1>
          <p className="mt-1 flex items-center gap-2 font-mono text-lg tracking-widest text-ink-soft">
            {partida.codigo}
            <span className="text-xs uppercase tracking-wide">{partida.tipo}</span>
          </p>
        </div>
        <Link
          to="/mis-proyectos"
          className="text-sm font-medium text-ink hover:underline"
        >
          ← Volver
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </p>
      )}

      {!yaFinalizada && (
        <form
          onSubmit={agregarPalabra}
          className="flex flex-col gap-3 rounded-lg border border-line bg-tile p-5 text-ink"
        >
          <label htmlFor="palabra-nueva" className="text-sm font-medium text-ink-soft">
            Agregar palabra
          </label>
          <div className="flex gap-2">
            <input
              id="palabra-nueva"
              value={nuevaPalabra}
              onChange={(e) => setNuevaPalabra(e.target.value)}
              placeholder="Ej: HELADO"
              className="flex-1 rounded-md border-2 border-ink/10 bg-tile-light px-3 py-2 uppercase text-ink placeholder:normal-case placeholder:text-ink-soft/50 outline-none focus:border-amber"
            />
            <button
              type="submit"
              disabled={cargandoAccion || !nuevaPalabra.trim()}
              className="rounded-md bg-amber px-4 py-2 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Agregar
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-ink">
          Palabras ({partida.palabras.length})
        </h2>

        <ul className="flex flex-col gap-2">
          {partida.palabras.map((p) => (
            <li
              key={p.id}
              className={`flex items-center justify-between gap-3 rounded-md border px-4 py-2 ${
                p.encontrada ? "border-amber bg-amber/10" : "border-line/30"
              }`}
            >
              {editandoId === p.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={editandoTexto}
                    onChange={(e) => setEditandoTexto(e.target.value)}
                    autoFocus
                    className="flex-1 rounded-md border-2 border-ink/10 bg-tile-light px-2 py-1 uppercase text-ink outline-none focus:border-amber"
                  />
                  <button
                    onClick={() => guardarEdicion(p.id)}
                    disabled={cargandoAccion}
                    className="rounded-md bg-ink px-3 py-1 text-xs font-semibold text-tile-light disabled:opacity-60"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setEditandoId(null);
                      setEditandoTexto("");
                    }}
                    className="text-xs font-medium text-ink-soft hover:underline"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-ink">{p.palabra}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-soft">
                      {p.encontrada ? "encontrada" : p.posicion ? "posicionada" : "sin posición"}
                    </span>
                    {!yaFinalizada && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditandoId(p.id);
                            setEditandoTexto(p.palabra);
                          }}
                          disabled={cargandoAccion}
                          className="text-xs font-medium text-ink hover:underline disabled:opacity-60"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarPalabra(p.id)}
                          disabled={cargandoAccion}
                          className="text-xs font-medium text-coral hover:underline disabled:opacity-60"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {partida.tipo === "crucigrama" ? (
        <div className="rounded-lg border border-amber/40 bg-tile p-5 text-ink">
          <p className="text-sm">
            La generación de <strong>crucigramas</strong> todavía no está implementada en
            el backend. Podés seguir agregando palabras, pero no se podrá generar la
            grilla por ahora.
          </p>
        </div>
      ) : yaFinalizada ? (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-tile p-5 text-ink">
          <p className="text-sm text-ink-soft">
            Esta partida ya está <strong>activa</strong> y lista para jugar. Compartí el
            código.
          </p>
          <Link
            to={`/jugar/${partida.codigo}`}
            className="inline-block w-fit rounded-md bg-amber px-4 py-2.5 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
          >
            Ir a jugar
          </Link>
        </div>
      ) : (
        <button
          onClick={finalizar}
          disabled={cargandoAccion || partida.palabras.length === 0}
          className="rounded-md bg-amber px-4 py-3 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Finalizar y generar sopa
        </button>
      )}

      <div className="mt-2 flex justify-end border-t border-line/20 pt-4">
        <button
          onClick={eliminar}
          disabled={cargandoAccion}
          className="text-sm font-medium text-coral hover:underline disabled:opacity-60"
        >
          Eliminar partida
        </button>
      </div>
    </div>
  );
}
