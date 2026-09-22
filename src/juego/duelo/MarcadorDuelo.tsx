import { textoMarcadorDuelo } from "../../utils/contadorDuelo";

export interface MarcadorDueloProps {
  nombrePropio: string;
  nombreRival: string | null;
  propio: number;
  rival: number;
  total: number;
}

export function MarcadorDuelo(props: MarcadorDueloProps) {
  const texto = textoMarcadorDuelo(
    { nombre: props.nombrePropio, contador: props.propio },
    { nombre: props.nombreRival, contador: props.rival },
    props.total,
  );

  return (
    <span className="rounded-full bg-tile px-3 py-1 font-mono text-xs font-semibold tabular-nums text-ink">
      {texto}
    </span>
  );
}