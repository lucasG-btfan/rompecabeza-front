import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit2 } from "react-icons/fi";
import { partidasApi } from "../api/partidas";
import type { ResumenPartida } from "../types";

function estadoEtiqueta(estado: string): { texto: string; clase: string } {
  switch (estado) {
    case "activo":
      return { texto: "Jugando", clase: "bg-amber text-ink" };
    case "finalizado":
      return { texto: "Finalizada", clase: "bg-line/20 text-ink-soft" };
    default:
      return { texto: "Creando", clase: "bg-coral/20 text-ink" };
  }
}

export function MisProyectos() {
  const [partidas, setPartidas] = useState<ResumenPartida[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editandoCodigo, setEditandoCodigo] = useState<string | null>(null);
  const [textoNombre, setTextoNombre] = useState("");
  const [errorRenombrar, setErrorRenombrar] = useState<string | null>(null);
  const blurEnCurso = useRef(false);

  async function _guardarNombre(codigo: string, nombre: string | null) {
    const anterior = partidas?.find((p) => p.codigo === codigo)?.nombre ?? null;
    setPartidas(
      (ps) =>
        ps?.map((p) => (p.codigo === codigo ? { ...p, nombre } : p)) ?? null
    );
    setErrorRenombrar(null);
    try {
      let res = await partidasApi.renombrar(codigo, nombre);
      setPartidas(
        (ps) => ps?.map((p) => (p.codigo === codigo ? res : p)) ?? null
      );
    } catch (e) {
      // revertir + error inline con auto-clear ~3s
      setPartidas(
        (ps) =>
          ps?.map((p) => (p.codigo === codigo ? { ...p, nombre: anterior } : p)) ?? null
      );
      const msg = e instanceof Error ? e.message : "No se pudo renombrar.";
      setErrorRenombrar(msg);
      window.setTimeout(() => setErrorRenombrar((m) => (m === msg ? null : m)), 3000);
    }
  }

  useEffect(() => {
    partidasApi
      .listarMias()
      .then(setPartidas)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar."));
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">Mis partidas</h1>
        <Link
          to="/dashboard"
          className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
        >
          + Nueva
        </Link>
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      {partidas === null ? (
        <p className="text-sm text-ink-soft">Cargando…</p>
      ) : partidas.length === 0 ? (
        <div className="rounded-lg border border-line bg-tile p-8 text-center text-ink">
          <p className="font-display text-xl">Todavía no creaste ninguna partida</p>
          <p className="mt-2 text-sm text-ink-soft">
            Creá tu primera partida para generar un código y compartirlo.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {partidas.map((p) => {
            const { texto, clase } = estadoEtiqueta(p.estado);
            return (
              <li
                key={p.id}
                className="group flex items-center justify-between gap-4 rounded-lg border border-line bg-tile px-5 py-4 text-ink"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    {editandoCodigo === p.codigo ? (
                      <input
                        autoFocus
                        value={textoNombre}
                        onChange={(e) => setTextoNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            blurEnCurso.current = true; // Enter → blur: evitar doble PATCH
                            void _guardarNombre(p.codigo, textoNombre.trim() || null);
                            setEditandoCodigo(null);
                          } else if (e.key === "Escape") {
                            blurEnCurso.current = true; // cancelar sin PATCH
                            setEditandoCodigo(null);
                          }
                        }}
                        onBlur={() => {
                          if (blurEnCurso.current) {
                            blurEnCurso.current = false;
                            return; // ya guardado o cancelado
                          }
                          void _guardarNombre(p.codigo, textoNombre.trim() || null);
                          setEditandoCodigo(null);
                        }}
                        maxLength={50}
                        className="w-48 rounded-md border border-line bg-tile px-2 py-1 font-mono text-lg text-ink focus:border-coral focus:outline-none"
                        aria-label="Nombre de la partida"
                      />
                    ) : p.nombre ? (
                      <span className="font-display text-lg text-ink">{p.nombre}</span>
                    ) : (
                      <span className="font-mono text-lg font-semibold tracking-widest">
                        {p.codigo}
                      </span>
                    )}
                    {p.nombre && (
                      <span className="font-mono text-sm tracking-widest text-ink-soft">
                        {p.codigo}
                      </span>
                    )}
                    <span className="text-xs uppercase tracking-wide text-ink-soft">
                      {p.tipo}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTextoNombre(p.nombre ?? "");
                        setEditandoCodigo(p.codigo);
                      }}
                      className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                      aria-label="Renombrar partida"
                      title="Renombrar"
                    >
                      <FiEdit2 className="text-sm text-ink-soft hover:text-coral" />
                    </button>
                  </div>
                  {errorRenombrar && (
                    <p className="text-xs text-coral" role="alert">
                      {errorRenombrar}
                    </p>
                  )}
                  <p className="text-sm text-ink-soft">
                    {p.palabras_encontradas} de {p.palabras_total} palabras
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {p.en_duelo && (
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-tile-light" title="Esta partida tiene un duelo 1v1 en curso">
                      en duelo
                    </span>
                  )}
                  {p.en_espera && !p.en_duelo && (
                    <span className="rounded-full border border-line bg-tile-light px-3 py-1 text-xs font-semibold text-ink-soft" title="Alguien está esperando rival para esta partida">
                      esperando rival
                    </span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${clase}`}>
                    {texto}
                  </span>
                  <Link
                    to={`/mis-proyectos/${p.codigo}`}
                    className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                  >
                    Editar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
