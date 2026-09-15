import { useEffect, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { partidasApi } from "../api/partidas";
import { ConfirmarSalida } from "../juego/compartido/ConfirmarSalida";
import { Cronometro } from "../juego/compartido/Cronometro";
import { SopaGame } from "../juego/sopa/SopaGame";
import { CrucigramaGame } from "../juego/crucigrama/CrucigramaGame";
import { useAuth } from "../store/auth";
import { mensajeError } from "../utils/errores";
import { formatearTiempo } from "../utils/tiempo";
import type { EstadoPartida, Partida, Posicion } from "../types";

// Cronómetro del invitado (C-12 D2): el timestamp propio se persiste entre
// recargas con la misma clave que el progreso (localStorage, con copia en
// memoria si está bloqueado — modo privado: el reloj arranca en 00:00).
// A nivel módulo para que el effect no dependa de un closure inestable.
function obtenerInicioInvitado(codigo: string): number {
  const clave = `tiempo_inicio_${codigo}`;
  try {
    const guardado = window.localStorage.getItem(clave);
    if (guardado) return Number(guardado);
    const ahora = Date.now();
    window.localStorage.setItem(clave, String(ahora));
    return ahora;
  } catch {
    return Date.now();
  }
}

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
  /** Epoch ms del arranque del cronómetro (null hasta unirse con éxito). */
  const [inicio, setInicio] = useState<number | null>(null);
  /** Tiempo final en ms capturado al completar (C-13 D2): el reloj se congela. */
  const [tiempoFinalMs, setTiempoFinalMs] = useState<number | null>(null);

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
        ]).then(([unirse, partidaPublica]) => {
          if (!activo) return;
          setEstado(estadoPartida);
          setPartida(partidaPublica);
          setError(null);
          // Cronómetro (C-12 D2): registrado → `iniciado_en` de su
          // participación; invitado → timestamp propio persistido.
          setInicio(
            unirse.modo === "registrado"
              ? Date.parse(unirse.iniciado_en ?? "") || Date.now()
              : obtenerInicioInvitado(codigo),
          );
        });
      })
      .catch((err) => {
        if (!activo) return;
        // Errores distinguibles (C-12 D6): 404 → código inválido, 500 →
        // servidor caído; el resto pasa el detail que escribió el backend.
        setError(mensajeError(err instanceof Error ? err : null));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [codigo]);

  /** Hay una partida activa cargada: única situación donde tiene sentido
   * bloquear la salida (hay progreso que perder). */
  const hayPartidaEnCurso = estado?.estado === "activo";
  const completada = total > 0 && encontradas === total;
  /** Nombre del juego con artículo para el mensaje de completado (D4):
   * "la sopa" (femenino) / "el crucigrama" (masculino). */
  const nombreJuego = estado?.tipo === "sopa" ? "la sopa" : "el crucigrama";

  // D2 (C-13): al completar se captura el tiempo final UNA sola vez
  // (Date.now() - inicio). Después queda congelado en la pantalla de
  // completado; el Cronometro en vivo deja de renderizarse.
  useEffect(() => {
    if (completada && inicio != null && tiempoFinalMs === null) {
      setTiempoFinalMs(Date.now() - inicio);
    }
  }, [completada, inicio, tiempoFinalMs]);

  // D3 (C-13): bloquea la navegación SPA (react-router) mientras la partida
  // está en curso. No cubre hard reloads/cross-origin -> beforeunload abajo.
  const blocker = useBlocker(() => hayPartidaEnCurso && !completada);

  // D3 (C-13): aviso nativo del navegador ante cierre/recarga de pestaña.
  // Se registra solo con partida en curso y se remueve al desmontar o
  // cuando la partida se completa (ya no hay progreso que perder).
  useEffect(() => {
    if (!hayPartidaEnCurso || completada) return;
    function manejarBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", manejarBeforeUnload);
    return () => window.removeEventListener("beforeunload", manejarBeforeUnload);
  }, [hayPartidaEnCurso, completada]);

  // D3 (C-13): salir confirmado = perder TODO. Para invitados se limpia el
  // progreso de localStorage de esa partida (resuelve PA-05); los registrados
  // quedan sin UI de retomar pero con la participación persistida. La limpieza
  // es síncrona y corre ANTES de continuar la navegación bloqueada.
  function confirmarSalida() {
    try {
      window.localStorage.removeItem(`sopa_progreso_${codigo}`);
      window.localStorage.removeItem(`crucigrama_progreso_${codigo}`);
      window.localStorage.removeItem(`tiempo_inicio_${codigo}`);
    } catch {
      // localStorage bloqueado (modo privado): nada que limpiar.
    }
    if (blocker.state === "blocked") blocker.proceed();
  }

  function manejarPalabraEncontrada(
    palabraId: string,
    posicion?: Posicion | null,
  ) {
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-6">
      {blocker.state === "blocked" && (
        <ConfirmarSalida
          onConfirmar={confirmarSalida}
          onCancelar={() => blocker.reset()}
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
          {inicio != null && !completada && (
            <span className="rounded-full bg-tile px-3 py-1 font-mono text-xs font-semibold tabular-nums text-ink-soft">
              <Cronometro desde={inicio} />
            </span>
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

      {completada ? (
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
          esInvitado={esInvitado}
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
          esInvitado={esInvitado}
          onPalabraEncontrada={manejarPalabraEncontrada}
          onProgreso={(e, t) => {
            setEncontradas(e);
            setTotal(t);
          }}
        />
      )}
    </div>
  );
}
