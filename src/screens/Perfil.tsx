import { Link } from "react-router-dom";
import { useAuth } from "../store/auth";

export function Perfil() {
  const { usuario } = useAuth();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="font-display text-3xl text-ink">Perfil</h1>

      <div className="rounded-lg border border-line bg-tile p-6 text-ink">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-soft">Usuario</p>
            <p className="font-display text-2xl">{usuario?.username}</p>
          </div>
        </div>

        <dl className="mt-6 flex flex-col gap-3 border-t border-line/20 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Miembro desde</dt>
            <dd className="font-medium text-ink">
              {usuario?.creado_en
                ? new Date(usuario.creado_en).toLocaleDateString("es-AR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-line/30 bg-tile p-5 text-ink">
        <p className="text-sm text-ink-soft">
          Tus <strong>puntos de partidas jugadas</strong> se calculan por partida y
          aparecen en el ranking de cada una. Todavía no hay un endpoint que los
          sume en un perfil global; cuando exista, se suma acá.
        </p>
      </div>

      <Link
        to="/mis-proyectos"
        className="rounded-md bg-amber px-4 py-2.5 text-center font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
      >
        Ver mis partidas
      </Link>
    </div>
  );
}
