import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { partidasApi } from "../api/partidas";
import type { Partida } from "../types";
import { EditorCrucigrama } from "../juego/crucigrama/editor/EditorCrucigrama";

export function EditarPartida() {
  const { codigo = "" } = useParams();
  const navigate = useNavigate();

  const [partida, setPartida] = useState<Partida | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevaPalabra, setNuevaPalabra] = useState("");
  const [nuevaPista, setNuevaPista] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoTexto, setEditandoTexto] = useState("");
  const [editandoPista, setEditandoPista] = useState("");
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
    // Mandamos la palabra COMO LA ESCRIBIÓ el usuario (con espacios/guiones si
    // los tiene): el backend genera la versión de grilla (palabra) y la legible
    // (texto_mostrar) a partir de este texto original.
    const palabra = nuevaPalabra.trim();
    if (!palabra) return;
    const pista = nuevaPista.trim();
    setCargandoAccion(true);
    try {
      const nuevas = await partidasApi.agregarPalabras(
        codigo,
        pista ? [{ palabra, explicacion: pista }] : [{ palabra }],
      );
      setPartida((prev) =>
        prev
          ? { ...prev, palabras: [...prev.palabras, ...nuevas] }
          : prev,
      );
      setNuevaPalabra("");
      setNuevaPista("");
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
    const palabra = editandoTexto.trim();
    if (!palabra) return;
    const pista = editandoPista.trim();
    setCargandoAccion(true);
    setError(null);
    try {
      // Sin pista se manda { palabra }: el backend setea explicacion=None y la
      // quita (dejar el campo vacío al editar = borrar la pista).
      const actualizada = await partidasApi.editarPalabra(
        codigo,
        palabraId,
        pista ? { palabra, explicacion: pista } : { palabra },
      );
      setPartida((prev) =>
        prev
          ? { ...prev, palabras: prev.palabras.map((p) => (p.id === palabraId ? actualizada : p)) }
          : prev,
      );
      setEditandoId(null);
      setEditandoTexto("");
      setEditandoPista("");
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

  // Gating por rol (C-12, D1 REVISADO): el editor es del creador. Quien no lo
  // es (otro usuario autenticado o invitado con el código) no ve el editor —
  // las soluciones del crucigrama viajan null en la vista pública y toda
  // mutación exige cookie de creador (403). El backend setea `es_creador` por
  // sesión; el creador autenticado pasa por acá sin cambios.
  if (!partida.es_creador) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-10">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-tile p-8 text-center text-ink">
          <p className="font-display text-2xl">Esta partida no es tuya</p>
          <p className="text-sm text-ink-soft">
            Solo el creador puede editarla. Si te compartieron el código, podés
            jugarla.
          </p>
          <Link
            to={`/jugar/${partida.codigo}`}
            className="rounded-md bg-amber px-5 py-2.5 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
          >
            Ir a jugar
          </Link>
        </div>
      </div>
    );
  }

  const yaFinalizada = partida.estado !== "creando";

  const cajaActiva = (
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
  );

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
              placeholder="Ej: CO-AUTOR"
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
          {partida.tipo === "crucigrama" && (
            <input
              aria-label="Pista de la palabra nueva"
              value={nuevaPista}
              onChange={(e) => setNuevaPista(e.target.value)}
              placeholder="Pista: la definición que verá el jugador (obligatoria para finalizar)"
              className="rounded-md border-2 border-ink/10 bg-tile-light px-3 py-2 text-ink placeholder:text-ink-soft/50 outline-none focus:border-amber"
            />
          )}
          <p className="text-xs text-ink-soft/80">
            Los espacios y guiones no entran a la grilla ("co-autor" se juega como{" "}
            <strong>COAUTOR</strong>), pero la lista los muestra tal cual los escribiste.
          </p>
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
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    value={editandoTexto}
                    onChange={(e) => setEditandoTexto(e.target.value)}
                    autoFocus
                    className="w-full rounded-md border-2 border-ink/10 bg-tile-light px-2 py-1 uppercase text-ink outline-none focus:border-amber"
                  />
                  {partida.tipo === "crucigrama" && (
                    <input
                      aria-label="Pista"
                      value={editandoPista}
                      onChange={(e) => setEditandoPista(e.target.value)}
                      placeholder="Pista (vacío = sin pista)"
                      className="w-full rounded-md border-2 border-ink/10 bg-tile-light px-2 py-1 text-ink outline-none focus:border-amber"
                    />
                  )}
                  <div className="flex items-center gap-3">
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
                        setEditandoPista("");
                      }}
                      className="text-xs font-medium text-ink-soft hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="font-medium text-ink">{p.texto_mostrar ?? p.palabra ?? ""}</span>
                    {p.explicacion && (
                      <span className="text-xs text-ink-soft/80">Pista: {p.explicacion}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-soft">
                      {p.encontrada ? "encontrada" : p.posicion ? "posicionada" : "sin posición"}
                    </span>
                    {!yaFinalizada && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditandoId(p.id);
                            setEditandoTexto(p.texto_mostrar ?? p.palabra ?? "");
                            setEditandoPista(p.explicacion ?? "");
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
        yaFinalizada ? (
          cajaActiva
        ) : (
          // key = ids de palabras: al agregar/editar/eliminar una palabra, el
          // editor se remonta y recarga del backend (su estado local quedaba
          // desincronizado: el contador "x de N posicionadas" y la lista
          // quedaban viejos hasta refrescar la página).
          <EditorCrucigrama
            key={partida.palabras.map((p) => p.id).join(",")}
            codigo={codigo}
            onFinalizada={cargar}
          />
        )
      ) : yaFinalizada ? (
        cajaActiva
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
