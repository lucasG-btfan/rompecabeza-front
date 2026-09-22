import { useEffect, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { emparejamientosApi } from "../api/emparejamientos";
import { partidasApi } from "../api/partidas";
import { useDuelo } from "../hooks/useDuelo";
import { ConfirmarAbandono } from "../juego/duelo/ConfirmarAbandono";
import { DueloExpirado } from "../juego/duelo/DueloExpirado";
import { MarcadorDuelo } from "../juego/duelo/MarcadorDuelo";
import { ResultadoDuelo as PantallaResultadoDuelo } from "../juego/duelo/ResultadoDuelo";
import { ConfirmarSalida } from "../juego/compartido/ConfirmarSalida";
import { Cronometro } from "../juego/compartido/Cronometro";
import { SopaGame } from "../juego/sopa/SopaGame";
import { CrucigramaGame } from "../juego/crucigrama/CrucigramaGame";
import { useAuth } from "../store/auth";
import { mensajeError } from "../utils/errores";
import { formatearTiempo } from "../utils/tiempo";
import type { EstadoPartida, Partida, Posicion, ResultadoDuelo } from "../types";

export function Jugar() {
  const { codigo = "" } = useParams();
  const navigate = useNavigate();
  const { modo, usuario } = useAuth();
  const esInvitado = modo !== "logueado";
  const username = usuario?.username ?? "Invitado";

  const duelo = useDuelo();

  const [estado, setEstado] = useState<EstadoPartida | null>(null);
  const [partida, setPartida] = useState<Partida | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [total, setTotal] = useState(0);
  const [encontradas, setEncontradas] = useState(0);

  const [inicio, setInicio] = useState<number | null>(null);
  const [tiempoFinalMs, setTiempoFinalMs] = useState<number | null>(null);
  const [enDuelo, setEnDuelo] = useState(false);
  const [confirmarAbandonoAbierto, setConfirmarAbandonoAbierto] = useState(false);

  useEffect(() => {
    let activo = true;

    partidasApi
      .obtenerEstado(codigo)
      .then((estadoPartida) => {
        if (!activo) return;

        if (estadoPartida.estado !== "activo") {
          setEstado(estadoPartida);
          setError("Esta partida todavía no está activa. Esperá a que el creador la publique.");
          return;
        }

        return Promise.all([
          partidasApi.unirsePartida(codigo),
          partidasApi.obtenerPartida(codigo),
        ]).then(([unirse, partidaPublica]) => {
          if (!activo) return;
          setEstado(estadoPartida);
          setPartida(partidaPublica);
          setError(null);
          setEnDuelo(unirse.emparejado);
          if (unirse.emparejado) duelo.arrancar(codigo);
          setInicio(Date.now());
        });
      })
      .catch((err) => {
        if (!activo) return;
        setError(mensajeError(err instanceof Error ? err : null));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [codigo]);

  const hayResultado = duelo.resultado != null;
  const dueloExpirado = duelo.estado === "expirado";
  const hayPartidaEnCurso =
    estado?.estado === "activo" && !hayResultado && !dueloExpirado;
  const completada = total > 0 && encontradas === total;
  const nombreJuego = estado?.tipo === "sopa" ? "la sopa" : "el crucigrama";

  useEffect(() => {
    if (completada && inicio != null && tiempoFinalMs === null) {
      setTiempoFinalMs(Date.now() - inicio);
    }
  }, [completada, inicio, tiempoFinalMs]);

  const blocker = useBlocker(() => hayPartidaEnCurso && !completada);

  useEffect(() => {
    if (!hayPartidaEnCurso || completada) return;
    function manejarBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", manejarBeforeUnload);
    return () => window.removeEventListener("beforeunload", manejarBeforeUnload);
  }, [hayPartidaEnCurso, completada]);

  function confirmarSalida() {
    try {
      window.localStorage.removeItem(`sopa_progreso_${codigo}`);
      window.localStorage.removeItem(`crucigrama_progreso_${codigo}`);
      window.localStorage.removeItem(`tiempo_inicio_${codigo}`);
    } catch {
    }
    if (blocker.state === "blocked") blocker.proceed();
  }

  function manejarPalabraEncontrada(
    palabraId: string,
    posicion?: Posicion | null,
    dueloFinalizado?: ResultadoDuelo | null,
  ) {
    if (dueloFinalizado && enDuelo) duelo.finalizar(dueloFinalizado);

    setEstado((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        palabras: prev.palabras.map((p) =>
          p.id === palabraId
            ? { ...p, encontrada: true, posicion: posicion ?? p.posicion }
            : p,
        ),
      };
    });
  }

  function manejarPalabraCrucigramaEncontrada(
    palabraId: string,
    dueloFinalizado?: ResultadoDuelo | null,
  ) {
    manejarPalabraEncontrada(palabraId, null, dueloFinalizado);
  }

  async function confirmarAbandonar() {
    setConfirmarAbandonoAbierto(false);
    try {
      const res = await emparejamientosApi.abandonar(codigo);
      duelo.finalizar(res);
    } catch (e) {
      setError(mensajeError(e instanceof Error ? e : null));
    }
  }

  if (cargando) {
    return <p className="text-sm text-ink-soft">Cargando partida…</p>;
  }

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

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-6">
      {blocker.state === "blocked" && (
        <ConfirmarSalida
          onConfirmar={confirmarSalida}
          onCancelar={() => blocker.reset()}
        />
      )}

      {confirmarAbandonoAbierto && (
        <ConfirmarAbandono
          rival={duelo.rival}
          onConfirmar={confirmarAbandonar}
          onCancelar={() => setConfirmarAbandonoAbierto(false)}
        />
      )}

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
        <div className="flex items-center gap-2">
          {enDuelo && duelo.estado === "activo" && !hayResultado && (
            <button
              onClick={() => setConfirmarAbandonoAbierto(true)}
              className="rounded-full border border-coral/50 px-3 py-1 text-xs font-semibold text-coral transition-colors hover:bg-coral hover:text-white"
            >
              Abandonar duelo
            </button>
          )}
          {inicio != null && !completada && !hayResultado && (
            <span className="rounded-full bg-tile px-3 py-1 font-mono text-xs font-semibold tabular-nums text-ink-soft">
              <Cronometro desde={inicio} />
            </span>
          )}
          {enDuelo && duelo.estado === "activo" && !hayResultado && total > 0 && (
            <MarcadorDuelo
              nombrePropio={username}
              nombreRival={duelo.rival}
              propio={encontradas}
              rival={duelo.rivalContador ?? 0}
              total={total}
            />
          )}
          <span className="rounded-full bg-tile px-3 py-1 text-xs font-semibold text-ink">
            {encontradas}/{total || 0}
            {total > 0 && !completada && (
              <span className="text-ink-soft">
                {" "}
                · faltan {total - encontradas}
              </span>
            )}
          </span>
        </div>
      </div>

      {error && <p className="text-center text-sm text-coral">{error}</p>}

      {dueloExpirado ? (
        <DueloExpirado
          onJugarOtro={() => navigate("/lobby")}
          onAbandonar={() => navigate("/")}
        />
      ) : duelo.resultado != null ? (
        <PantallaResultadoDuelo
          resultado={duelo.resultado}
          username={username}
          tipo={estado.tipo}
          partida={partida}
          onJugarOtro={() => navigate("/lobby")}
          onAbandonar={() => navigate("/")}
        />
      ) : completada ? (
        <div className="animate-win-pop flex w-full flex-col items-center gap-4 rounded-lg border border-amber bg-tile p-8 text-center text-ink">
          <p className="font-display text-2xl">
            ¡Completaste {nombreJuego} en{" "}
            {tiempoFinalMs != null
              ? formatearTiempo(Math.floor(tiempoFinalMs / 1000))
              : "—"}
            !
          </p>
          <p className="text-sm text-ink-soft">
            Encontraste todas las palabras. ¡Volvé a entrar cuando quieras
            o creá otra partida!
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="rounded-md bg-amber px-5 py-2.5 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
            >
              Volver al home
            </button>
            {partida?.es_creador && (
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-md border border-line bg-tile px-5 py-2.5 font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                Crear nueva partida
              </button>
            )}
          </div>
        </div>
      ) : estado.tipo === "sopa" ? (
        <SopaGame
          codigo={codigo}
          estado={estado}
          onPalabraEncontrada={manejarPalabraEncontrada}
          onProgreso={(e, t) => {
            setEncontradas(e);
            setTotal(t);
          }}
        />
      ) : (
        <CrucigramaGame
          codigo={codigo}
          estado={estado}
          partida={partida}
          onPalabraEncontrada={manejarPalabraCrucigramaEncontrada}
          onProgreso={(e, t) => {
            setEncontradas(e);
            setTotal(t);
          }}
        />
      )}
    </div>
  );
}
