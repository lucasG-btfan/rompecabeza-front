import { useState } from "react";

export function CodigoGenerado({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-ink/10 bg-tile-light p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-soft">Código de la partida</p>
        <p className="font-mono text-2xl font-semibold tracking-widest text-ink">{codigo}</p>
      </div>
      <button
        onClick={copiar}
        className="rounded-md border-2 border-ink/10 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-amber"
      >
        {copiado ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
