import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lobbyApi } from "../api/lobby";
import Carrusel from "../components/lobby/Carrusel";
import Popup from "../components/lobby/Popup";
import { useAuth } from "../store/auth";
import type { PartidaLobby } from "../types";
import { mensajeError } from "../utils/errores";
import { useEmparejamiento } from "../hooks/useEmparejamiento";

/** Formatea segundos como mm:ss (reloj de espera del duelo). */
function formatoReloj(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Pantalla del lobby (C-17, D12): carrusel público de partidas activas +
 *  popup de acciones + flujo de matchmaking 1v1 (hook useEmparejamiento, D13).
 *  Acceso libre: los invitados navegan el lobby pero el 1v1 les pide login. */
export function Lobby() {
  const navigate = useNavigate();
  const { modo } = useAuth();
  const esInvitado = modo !== "logueado";

  const [partidas, setPartidas] = useState<PartidaLobby[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorLobby, setErrorLobby] = useState<string | null>(null);
  const [indiceSopa, setIndiceSopa] = useState(0);
  const [indiceCrucigrama, setIndiceCrucigrama] = useState(0);
  const [partidaSeleccionada, setPartidaSeleccionada] = useState<PartidaLobby | null>(null);

  const espera = useEmparejamiento();
  const sopas = useMemo(() => partidas.filter((p) => p.tipo === "sopa"), [partidas]);
  const crucigramas = useMemo(
    () => partidas.filter((p) => p.tipo === "crucigrama"),
    [partidas],
  );

  const cargarPartidas = useCallback(async () => {
    setCargando(true);
    setErrorLobby(null);
    try {
      const lista = await lobbyApi.listar();
      setPartidas(lista);
      setIndiceSopa(0);
      setIndiceCrucigrama(0);
    } catch (e) {
      setErrorLobby(
        e instanceof Error ? mensajeError({ message: e.message }) : mensajeError(null),
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarPartidas();
  }, [cargarPartidas]);

  // Al emparejarse, ambos jugadores van a la misma partida (C-14: progreso
  // efímero — el punteo del duelo es del frontend).
  useEffect(() => {
    if (espera.estado === "emparejado" && espera.codigoPartida !== null) {
      navigate(`/jugar/${espera.codigoPartida}`);
    }
  }, [espera.estado, espera.codigoPartida, navigate]);

  function manejarJugar1v1() {
    if (partidaSeleccionada === null) return;
    const codigo = partidaSeleccionada.codigo;
    setPartidaSeleccionada(null);
    void espera.crearEmparejamiento(codigo);
  }

  // Estados del flujo 1v1: reemplazan el carrusel mientras duran.
  if (espera.estado !== "idle") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header>
          <h1 className="font-display text-3xl text-ink">Lobby</h1>
          <p className="mt-1 text-sm text-ink-soft">Elegí una partida para jugar 1v1.</p>
        </header>

        <div className="flex flex-col gap-4 rounded-lg border border-line bg-tile p-8 text-center text-ink shadow-[6px_6px_0_0_rgba(0,0,0,0.25)]">
          {espera.estado === "esperando" && (
            <>
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-amber" />
              <p className="font-display text-xl">Buscando rival…</p>
              <p className="font-mono text-2xl tabular-nums">
                ⏱ {formatoReloj(espera.segundosRestantes)}
              </p>
              <button
                type="button"
                onClick={() => void espera.cancelar()}
                className="mx-auto rounded-md border-2 border-ink/10 bg-tile-light px-5 py-2 font-semibold text-ink transition-colors hover:border-coral disabled:opacity-60"
                disabled={espera.segundosRestantes === 0}
              >
                Cancelar
              </button>
            </>
          )}

          {espera.estado === "tiempo_agotado" && (
            <>
              <p className="font-display text-xl">Se agotó el tiempo de espera</p>
              <p className="text-sm text-ink-soft">
                Nadie se unió a tu partida. Podés reintentar o cancelar.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void espera.reintentar()}
                  className="rounded-md bg-amber px-5 py-2 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={() => void espera.cancelar()}
                  className="rounded-md border-2 border-ink/10 bg-tile-light px-5 py-2 font-semibold text-ink transition-colors hover:border-coral"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}

          {espera.estado === "cancelado" && (
            <>
              <p className="font-display text-xl">Cancelaste la búsqueda</p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void espera.reintentar()}
                  className="rounded-md bg-amber px-5 py-2 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
                >
                  Buscar de nuevo
                </button>
                <button
                  type="button"
                  onClick={espera.resetear}
                  className="rounded-md border-2 border-ink/10 bg-tile-light px-5 py-2 font-semibold text-ink transition-colors hover:border-amber"
                >
                  Volver al carrusel
                </button>
              </div>
            </>
          )}

          {espera.estado === "expirado" && (
            <>
              <p className="font-display text-xl">Sin rival, reintentá</p>
              <p className="text-sm text-ink-soft">
                El rival no se presentó a tiempo. La partida volvió al lobby.
              </p>
              <button
                type="button"
                onClick={() => void espera.reintentar()}
                className="mx-auto rounded-md bg-amber px-5 py-2 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
              >
                Reintentar
              </button>
            </>
          )}

          {espera.estado === "error" && (
            <>
              <p className="font-display text-xl text-coral">No se pudo jugar 1v1</p>
              <p className="text-sm text-ink-soft">{espera.error}</p>
              <button
                type="button"
                onClick={() => void espera.reintentar()}
                className="mx-auto rounded-md bg-amber px-5 py-2 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
              >
                Reintentar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl text-ink">Lobby</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Elegí una partida para jugar 1v1.
        </p>
      </header>

      {cargando && <p className="text-sm text-ink-soft">Cargando partidas…</p>}

      {!cargando && errorLobby !== null && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-coral/40 bg-coral/10 p-5 text-coral">
          <p className="text-sm">{errorLobby}</p>
          <button
            type="button"
            onClick={() => void cargarPartidas()}
            className="rounded-md border border-coral/50 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-coral/20"
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && errorLobby === null && partidas.length === 0 && (
        <div className="rounded-lg border border-line bg-tile p-8 text-center text-ink">
          <p className="font-display text-xl">Todavía no hay partidas para jugar</p>
          <p className="mt-2 text-sm text-ink-soft">
            Creá una partida y compartí el código para que otros se sumen.
          </p>
        </div>
      )}

      {!cargando && errorLobby === null && partidas.length > 0 && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl text-ink">Sopas de letras</h2>
            {sopas.length > 0 ? (
              <Carrusel
                partidas={sopas}
                indice={indiceSopa}
                onCambiarIndice={setIndiceSopa}
                onSeleccionar={setPartidaSeleccionada}
              />
            ) : (
              <p className="rounded-lg border border-line bg-tile p-5 text-center text-sm text-ink-soft">
                Todavía no hay sopas de letras.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl text-ink">Crucigramas</h2>
            {crucigramas.length > 0 ? (
              <Carrusel
                partidas={crucigramas}
                indice={indiceCrucigrama}
                onCambiarIndice={setIndiceCrucigrama}
                onSeleccionar={setPartidaSeleccionada}
              />
            ) : (
              <p className="rounded-lg border border-line bg-tile p-5 text-center text-sm text-ink-soft">
                Todavía no hay crucigramas.
              </p>
            )}
          </section>

          {partidaSeleccionada !== null && (
            <Popup
              partida={partidaSeleccionada}
              esInvitado={esInvitado}
              onCerrar={() => setPartidaSeleccionada(null)}
              onJugar1v1={manejarJugar1v1}
            />
          )}
        </>
      )}
    </div>
  );
}