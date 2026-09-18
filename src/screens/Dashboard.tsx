import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import { PrimaryButton } from "../components/PrimaryButton";
import { CodigoGenerado } from "../components/codigo/CodigoGenerado";
import { ListaPalabrasInput } from "../components/ListaPalabrasInput";
import { partidasApi } from "../api/partidas";
import type { TipoPartida } from "../types";
import {
  nuevaFila,
  agregarFila,
  quitarFila,
  actualizarFila,
  filasAPalabras,
  type FilaPalabra,
} from "../utils/filasPalabras";

export function Dashboard() {
  const { usuario } = useAuth();

  const [tipo, setTipo] = useState<TipoPartida>("sopa");
  const [filas, setFilas] = useState<FilaPalabra[]>(() => [nuevaFila()]);
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigoCreado, setCodigoCreado] = useState<string | null>(null);

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // C-16 D4: convierte filas (palabra + pista) a PalabraInput[] según tipo.
    // R1 (sopa): nunca manda `explicacion`; R2 (crucigrama): la manda solo si
    // la pista no quedó vacía tras trim.
    const palabras = filasAPalabras(filas, tipo);

    if (palabras.length === 0) {
      setError("Escribí al menos una palabra.");
      return;
    }

    setCargando(true);
    try {
      const creada = await partidasApi.crearPartida({
        tipo,
        palabras,
        nombre: nombre.trim() || null,
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
              className="rounded-md bg-amber px-4 py-2.5 text-center font-semibold text-ink shadow-[3px_3px_0_0_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5"
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
            <label htmlFor="nombre" className="text-sm font-medium text-ink-soft">
              Nombre de la partida <span className="font-normal text-ink-soft/60">(opcional)</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              maxLength={50}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Fiesta de cumpleaños"
              className="mt-1.5 w-full rounded-md border-2 border-ink/10 bg-white/40 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 outline-none transition-colors focus:border-amber"
            />
          </div>

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

          <ListaPalabrasInput
            filas={filas}
            tipo={tipo}
            onCambiarFila={(indice, cambio) =>
              setFilas((prev) => actualizarFila(prev, indice, cambio))
            }
            onAgregarFila={() => setFilas((prev) => agregarFila(prev))}
            onQuitarFila={(indice) => setFilas((prev) => quitarFila(prev, indice))}
          />

          {error && <p className="text-sm text-coral">{error}</p>}

          <PrimaryButton type="submit" cargando={cargando}>
            Crear partida
          </PrimaryButton>
        </form>
      )}
    </div>
  );
}
