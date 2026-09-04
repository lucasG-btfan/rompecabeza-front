import type { Palabra } from "../../types";

interface CrucigramaGameProps {
  codigo: string;
  palabras: Palabra[];
}

/**
 * Modo crucigrama. OJO: el backend todavía NO genera la grilla de crucigramas
 * (el endpoint /finalizar solo soporta 'sopa'), así que por ahora mostramos un
 * aviso y la lista de palabras/pistas cargadas. La estructura queda lista para
 * conectar la grilla cuando el backend sume el soporte.
 */
export function CrucigramaGame({ palabras }: CrucigramaGameProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-md rounded-lg border border-amber/40 bg-tile p-6 text-center text-ink">
        <p className="font-display text-xl">Crucigrama en camino</p>
        <p className="mt-2 text-sm text-ink-soft">
          La generación automática del crucigrama todavía no está disponible en el
          backend. Mientras tanto, estas son las palabras cargadas:
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2">
        {palabras.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-md border border-line/30 px-4 py-2 text-ink"
          >
            <span className="font-medium">{p.palabra}</span>
            {p.explicacion && (
              <span className="text-sm text-ink-soft">{p.explicacion}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
