interface CeldaCrucigramaProps {
  letra: string;
  numero?: number | null;
  resaltada: boolean;
}

/**
 * Celda de crucigrama: opcionalmente muestra el número de pista en una esquina
 * y la letra en el centro. El crucigrama está pendiente de generación en el
 * backend, así que por ahora es la base visual para cuando exista.
 */
export function CeldaCrucigrama({ letra, numero, resaltada }: CeldaCrucigramaProps) {
  return (
    <div
      className={`relative flex h-9 w-9 items-center justify-center rounded-md font-display text-lg font-semibold sm:h-11 sm:w-11 ${
        resaltada ? "bg-amber text-ink" : "bg-tile-light text-ink"
      }`}
    >
      {numero != null && (
        <span className="absolute left-0.5 top-0.5 text-[9px] font-medium leading-none text-ink-soft">
          {numero}
        </span>
      )}
      <span>{letra}</span>
    </div>
  );
}
