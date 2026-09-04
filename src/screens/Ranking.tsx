import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { partidasApi } from "../api/partidas";
import type { RankingEntry } from "../types";

function formatearTiempo(segundos: number | null | undefined): string {
  if (segundos == null) return "—";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function Ranking() {
  const { codigo = "" } = useParams();
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    partidasApi
      .obtenerRanking(codigo)
      .then(setRanking)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el ranking."));
  }, [codigo]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">Ranking</h1>
        <Link to={`/jugar/${codigo}`} className="text-sm font-medium text-ink hover:underline">
          ← Volver a la partida
        </Link>
      </div>

      <p className="font-mono text-lg tracking-widest text-ink-soft">{codigo}</p>

      {error && <p className="text-sm text-coral">{error}</p>}

      {ranking === null ? (
        <p className="text-sm text-ink-soft">Cargando ranking…</p>
      ) : ranking.length === 0 ? (
        <p className="rounded-lg border border-line bg-tile p-6 text-center text-sm text-ink-soft">
          Todavía no hay puntajes. Solo los jugadores registrados que encontraron
          palabras aparecen acá.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ranking.map((entry, i) => (
            <li
              key={entry.username}
              className="flex items-center justify-between gap-4 rounded-lg border border-line bg-tile px-4 py-3 text-ink"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-display text-lg text-ink-soft">
                  {i + 1}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium">{entry.username}</span>
                  <span className="text-xs text-ink-soft">
                    {entry.palabras_encontradas} palabras · {formatearTiempo(entry.tiempo_segundos)}
                  </span>
                </div>
              </div>
              <span className="font-display text-xl text-amber">{entry.puntaje}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
