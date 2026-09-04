import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import { PrimaryButton } from "../components/PrimaryButton";
import { CodigoGenerado } from "../components/codigo/CodigoGenerado";
import { partidasApi } from "../api/partidas";
import type { TipoPartida } from "../types";

export function Dashboard() {
  const { usuario } = useAuth();

  const [tipo, setTipo] = useState<TipoPartida>("sopa");
  const [palabrasTexto, setPalabrasTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigoCreado, setCodigoCreado] = useState<string | null>(null);

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const palabras = palabrasTexto
      .split(/[,\n]/)
      .map((p) => p.trim().toUpperCase().replace(/\s+/g, ""))
      .filter(Boolean);

    if (palabras.length === 0) {
      setError("Escribí al menos una palabra.");
      return;
    }

    setCargando(true);
    try {
      const creada = await partidasApi.crearPartida({
        tipo,
        palabras: palabras.map((palabra) => ({ palabra })),
      });
      setCodigoCreado(creada.codigo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la partida.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Hola {usuario?.username}. Acá podés crear una partida nueva.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          to="/mis-proyectos"
          className="rounded-md border border-line/30 px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-amber"
        >
          Ver mis partidas →
        </Link>
      </div>

      {codigoCreado ? (
        <div className="flex flex-col gap-4 rounded-lg border border-line bg-tile p-6 text-ink shadow-[6px_6px_0_0_rgba(0,0,0,0.25)]">
          <h2 className="font-display text-xl">¡Partida creada!</h2>
          <CodigoGenerado codigo={codigoCreado} />
          <p className="text-sm text-ink-soft">
            Ahora podés agregar más palabras y finalizarla.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/mis-proyectos/${codigoCreado}`}
              className="rounded-md bg-amber px-4 py-2.5 text-center font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
            >
              Editar partida
            </Link>
            <button
              onClick={() => setCodigoCreado(null)}
              className="rounded-md border border-line/30 px-4 py-2.5 text-sm font-medium text-ink-soft hover:border-amber"
            >
              Crear otra
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={manejarSubmit}
          className="flex flex-col gap-4 rounded-lg border border-line bg-tile p-6 text-ink shadow-[6px_6px_0_0_rgba(0,0,0,0.25)]"
        >
          <div>
            <p className="mb-2 text-sm font-medium text-ink-soft">Tipo de partida</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTipo("sopa")}
                className={`flex-1 rounded-md border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  tipo === "sopa"
                    ? "border-amber bg-amber/10 text-ink"
                    : "border-ink/10 text-ink-soft hover:border-amber"
                }`}
              >
                Sopa de letras
              </button>
              <button
                type="button"
                onClick={() => setTipo("crucigrama")}
                className={`flex-1 rounded-md border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  tipo === "crucigrama"
                    ? "border-amber bg-amber/10 text-ink"
                    : "border-ink/10 text-ink-soft hover:border-amber"
                }`}
              >
                Crucigrama
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="palabras" className="text-sm font-medium text-ink-soft">
              Palabras
            </label>
            <textarea
              id="palabras"
              value={palabrasTexto}
              onChange={(e) => setPalabrasTexto(e.target.value)}
              placeholder="Separalas con coma, ej: CASA, PERRO, SOL"
              rows={3}
              className="rounded-md border-2 border-ink/10 bg-tile-light px-3 py-2 text-ink placeholder:text-ink-soft/50 outline-none transition-colors focus:border-amber"
            />
          </div>

          {tipo === "crucigrama" && (
            <p className="text-xs text-amber">
              Ojo: la generación de crucigramas todavía no está en el backend. Podés
              crearla pero no se va a poder generar la grilla todavía.
            </p>
          )}

          {error && <p className="text-sm text-coral">{error}</p>}

          <PrimaryButton type="submit" cargando={cargando}>
            Crear partida
          </PrimaryButton>
        </form>
      )}
    </div>
  );
}
