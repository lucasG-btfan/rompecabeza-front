import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { partidasApi } from "../api/partidas";
import { SopaGame } from "../juego/sopa/SopaGame";
import { CrucigramaGame } from "../juego/crucigrama/CrucigramaGame";
import { useAuth } from "../store/auth";
import type { EstadoPartida, Partida } from "../types";

export function Jugar() {
  const { codigo = "" } = useParams();
  const navigate = useNavigate();
  const { modo } = useAuth();
  const esInvitado = modo !== "logueado";

  const [estado, setEstado] = useState<EstadoPartida | null>(null);
  const [partida, setPartida] = useState<Partida | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [total, setTotal] = useState(0);
  const [encontradas, setEncontradas] = useState(0);

  useEffect(() => {
    let activo = true;

    // Cargamos el estado primero: nos dice si la partida está publicada
    // ('activo') o todavía en 'creando' (no se puede jugar).
    partidasApi
      .obtenerEstado(codigo)
      .then((estadoPartida) => {
        if (!activo) return;

        if (estadoPartida.estado !== "activo") {
          // Partida no publicada: no se puede jugar. Mostramos el aviso sin
          // llamar a unirse (que el backend rechaza igualmente).
          setEstado(estadoPartida);
          setError("Esta partida todavía no está activa. Esperá a que el creador la publique.");
          return;
        }

        // Partida activa: se une (arranca su cronómetro) y trae la partida
        // pública (explicaciones de las palabras) en paralelo.
        return Promise.all([
          partidasApi.unirsePartida(codigo),
          partidasApi.obtenerPartida(codigo),
        ]).then(([, partidaPublica]) => {
          if (!activo) return;
          setEstado(estadoPartida);
          setPartida(partidaPublica);
          setError(null);
        });
      })
      .catch((err) => {
        if (!activo) return;
        setError(
          err instanceof Error ? err.message : "No se pudo cargar la partida.",
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [codigo]);

  function manejarPalabraEncontrada(palabraId: string) {
    setEstado((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        palabras: prev.palabras.map((p) =>
          p.id === palabraId ? { ...p, encontrada: true } : p,
        ),
      };
    });
  }

  if (cargando) {
    return <p className="text-sm text-ink-soft">Cargando partida…</p>;
  }

  // Partida no publicada (estado != 'activo') o error de carga: avisamos y
  // ofrecemos volver, sin renderizar la sopa (no hay nada que jugar).
  if (!estado || estado.estado !== "activo") {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <p className="text-center text-coral">
          {error ?? "Esta partida todavía no está activa."}
        </p>
        <Link to="/" className="text-sm font-medium text-ink hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  const completada = total > 0 && encontradas === total;

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-6">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-baseline gap-3">
          <Link to="/" className="text-sm text-ink-soft hover:text-ink">
            ←
          </Link>
          <h1 className="font-mono text-xl font-semibold tracking-widest text-ink">
            {codigo}
          </h1>
          {esInvitado && (
            <span className="rounded-full bg-tile px-2 py-0.5 text-xs text-ink-soft">
              invitado
            </span>
          )}
        </div>
        <span className="rounded-full bg-tile px-3 py-1 text-xs font-semibold text-ink">
          {encontradas}/{total || 0}
        </span>
      </div>

      {estado.tipo === "sopa" ? (
        <SopaGame
          codigo={codigo}
          estado={estado}
          esInvitado={esInvitado}
          onPalabraEncontrada={manejarPalabraEncontrada}
          onProgreso={(e, t) => {
            setEncontradas(e);
            setTotal(t);
          }}
        />
      ) : (
        <CrucigramaGame codigo={codigo} palabras={partida?.palabras ?? []} />
      )}

      {completada && (
        <div className="flex w-full flex-col items-center gap-3 rounded-lg border border-amber bg-tile p-6 text-center text-ink">
          <p className="font-display text-2xl">¡Completaste todas las palabras!</p>
          <p className="text-sm text-ink-soft">
            Mirá el ranking de la partida para ver los puntajes.
          </p>
          <button
            onClick={() => navigate(`/jugar/${codigo}/ranking`)}
            className="rounded-md bg-amber px-5 py-2.5 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
          >
            Ver ranking
          </button>
        </div>
      )}
    </div>
  );
}
