import { useEffect, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { emparejamientosApi } from "../api/emparejamientos";
import { partidasApi } from "../api/partidas";
import { useDuelo } from "../hooks/useDuelo";
import { ConfirmarAbandono } from "../juego/duelo/ConfirmarAbandono";
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

  // C-19 (D10): hook del cierre del duelo 1v1 — poll 3s de
  // GET /emparejamientos/estado, terminación síncrona por jugada/abandono.
  const duelo = useDuelo();

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
  /** C-19: true si el unirse disparó auto-match 1v1 (UnirseResponse.emparejado). */
  const [enDuelo, setEnDuelo] = useState(false);
  /** C-19 (D12): modal de confirmación del abandono. */
  const [confirmarAbandonoAbierto, setConfirmarAbandonoAbierto] = useState(false);

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

        // Partida activa: se une y trae la partida pública (explicaciones de
        // las palabras) en paralelo. C-14: el cronómetro es 100% de la sesión
        // frontend (arranca acá, al unirse), no depende del backend.
        return Promise.all([
          partidasApi.unirsePartida(codigo),
          partidasApi.obtenerPartida(codigo),
        ]).then(([unirse, partidaPublica]) => {
          if (!activo) return;
          setEstado(estadoPartida);
          setPartida(partidaPublica);
          setError(null);
          // C-19 (D9): si el unirse disparó auto-match 1v1, enciende el poll
          // del duelo (el cierre llega por estado finalizado o por la propia
          // jugada que corta, D10).
          setEnDuelo(unirse.emparejado);
          if (unirse.emparejado) duelo.arrancar(codigo);
          // Cronómetro (C-14, D1): arranca en este mount. Salir y volver
          // reinicia la partida completa (00:00 y sin palabras encontradas).
          setInicio(Date.now());
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
   * bloquear la salida (hay progreso que perder). C-19 (D11): el resultado
   * del duelo manda sobre la sesión — al finalizar ya no se bloquea. */
  const hayResultado = duelo.resultado != null;
  const hayPartidaEnCurso = estado?.estado === "activo" && !hayResultado;
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

  // D3 (C-13): salir confirmado = perder TODO. C-14 (progreso efímero): ya no
  // se persiste progreso por jugador (ni backend ni localStorage), así que
  // salir y volver reinicia la partida desde cero. El barrido de las claves
  // legacy de localStorage queda como limpieza defensiva de datos viejos
  // (registrados e invitados de antes de C-14); el juego no las vuelve a
  // leer ni escribir. La limpieza es síncrona y corre ANTES de continuar la
  // navegación bloqueada.
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
    dueloFinalizado?: ResultadoDuelo | null,
  ) {
    // C-19 (D3/D5): la jugada que corta el duelo (última palabra) trae el
    // resultado en la misma respuesta → terminación SÍNCRONA (D10), sin
    // esperar al poll. C-22 (D6): el `&& enDuelo` es defensa en profundidad —
    // un `duelo_finalizado` que llega sin duelo activo en esta sesión (p. ej.
    // el fantasma de un duelo viejo en solitario) se IGNORA y el juego sigue.
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

  // C-19: el crucigrama (hook useCrucigramaJuego) no maneja posiciones de
  // selección (su jugada es responder la palabra activa): la firma de su
  // callback solo lleva el duelo_finalizado. Se delega al handler común.
  function manejarPalabraCrucigramaEncontrada(
    palabraId: string,
    dueloFinalizado?: ResultadoDuelo | null,
  ) {
    manejarPalabraEncontrada(palabraId, null, dueloFinalizado);
  }

  // C-19 (D4/D12): abandono = forfeit. Confirmado el modal, se llama al
  // backend; el resultado (gane: false) se muestra con la terminación
  // síncrona. Un error de red NO pierde el estado del juego: se avisa y el
  // duelo sigue.
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

      {/* C-19 (D12): confirmación del abandono — "Sí, abandonar" da el
          forfeit (el rival gana); "Seguir jugando" cierra el modal. */}
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
          {/* C-19 (D4): el abandono del duelo 1v1 solo existe con duelo activo
              y sin resultado (ya terminó → no hay nada que abandonar). */}
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
          {/* C-19 (AMEND CAMBIO 2): marcador visible del duelo "[J1] n/m
              [J2] n/m". n propio = sesión local (al toque); n rival = backend
              por poll (hasta 3 s de desfase, D10). Solo con duelo en curso. */}
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

      {/* Error de acciones del duelo (p. ej. red caída al abandonar): se avisa
          sin perder el estado del juego. El resto de errores de carga se
          manejan en el branch de partida no activa, arriba. */}
      {error && <p className="text-center text-sm text-coral">{error}</p>}

      {/* C-19 (D11): el resultado del duelo manda sobre la sesión — se muestra
          en lugar del tablero/cronómetro (misma mecánica que `completada`). */}
      {duelo.resultado != null ? (
        <PantallaResultadoDuelo
          resultado={duelo.resultado}
          username={username}
          tipo={estado.tipo}
          partida={partida}
          onVolverInicio={() => navigate("/")}
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
