import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
                className="flex items-center justify-between gap-4 rounded-lg border border-line bg-tile px-5 py-4 text-ink"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-semibold tracking-widest">
                      {p.codigo}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-ink-soft">
                      {p.tipo}
                    </span>
                  </div>
                  <p className="text-sm text-ink-soft">
                    {p.palabras_encontradas} de {p.palabras_total} palabras
                  </p>
                </div>

                <div className="flex items-center gap-3">
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
