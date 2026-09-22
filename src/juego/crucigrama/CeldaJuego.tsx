import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { describirCelda, type EstadoCeldaLabel } from "./logica";


interface CeldaJuegoProps {
  fila: number;
  columna: number;
  letra: string;
  numero?: number | null;
  tipo: "letra" | "negra";
  activa: boolean;
  encontrada: boolean;
  enError?: boolean;
  resaltada?: boolean;
  tieneFoco: boolean;
  onCeldaClick: () => void;
  onCambio: (e: ChangeEvent<HTMLInputElement>) => void;
  onTeclado: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function CeldaJuego({
  fila,
  columna,
  letra,
  numero,
  tipo,
  activa,
  encontrada,
  enError = false,
  resaltada = false,
  tieneFoco,
  onCeldaClick,
  onCambio,
  onTeclado,
}: CeldaJuegoProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const enFoco = useRef(tieneFoco);

  useEffect(() => {
    if (tieneFoco) {
      inputRef.current?.focus();
      const input = inputRef.current;
      if (input && input.selectionStart !== null) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
    enFoco.current = tieneFoco;
  }, [tieneFoco, letra]);

  if (tipo === "negra") {
    return (
      <div
        className="flex h-9 w-9 items-center justify-center rounded-md bg-ink/60 sm:h-11 sm:w-11"
        aria-hidden="true"
      />
    );
  }

  const contorno = activa ? "ring-2 ring-amber" : "";
  const fondo = enError
    ? "bg-coral text-ink"
    : encontrada
      ? "bg-amber text-ink"
      : "bg-tile-light text-ink";
  const animacion = resaltada ? " animate-found" : "";
  const base = `relative flex h-9 w-9 items-center justify-center rounded-md font-display text-lg font-semibold sm:h-11 sm:w-11 [touch-action:manipulation] ${contorno} ${fondo}${animacion}`;

  const estadoLabel: EstadoCeldaLabel = enError ? "error" : encontrada ? "encontrada" : "letra";
  const ariaLabel = describirCelda(
    { letra: letra || null, numero: numero ?? null, tipo },
    fila,
    columna,
    estadoLabel,
  );

  const numeroVisible = numero != null && (
    <span className="pointer-events-none absolute left-0.5 top-0.5 text-[9px] font-medium leading-none text-ink-soft">
      {numero}
    </span>
  );

  if (activa) {
    return (
      <div className={base} role="gridcell" id={`celda-${fila}-${columna}`} onClick={onCeldaClick}>
        {numeroVisible}
        <input
          ref={inputRef}
          value={letra}
          onChange={onCambio}
          onKeyDown={onTeclado}
          onClick={(e) => {
            e.stopPropagation();
            onCeldaClick();
          }}
          className={
            encontrada
              ? "h-full w-full bg-transparent text-center font-display text-lg font-semibold outline-none"
              : "h-full w-full bg-transparent text-center font-display text-lg font-semibold uppercase text-ink outline-none placeholder:text-transparent"
          }
          maxLength={1}
          autoComplete="off"
          spellCheck={false}
          aria-label={ariaLabel}
        />
      </div>
    );
  }

  return (
    <div
      id={`celda-${fila}-${columna}`}
      className={`${base} select-none`}
      role="gridcell"
      aria-label={ariaLabel}
      onClick={onCeldaClick}
    >
      {numeroVisible}
      <span>{letra}</span>
    </div>
  );
}