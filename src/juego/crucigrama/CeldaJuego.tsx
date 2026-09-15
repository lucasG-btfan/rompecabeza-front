import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { describirCelda, type EstadoCeldaLabel } from "./logica";

/**
 * Celda de crucigrama JUGABLE (C-10, D4/6.1; C-12, D5).
 *
 * Estados visuales:
 * - `negra`: estática, sin interacción (bg-ink/60) y oculta al lector de
 *   pantalla (aria-hidden; son separadores, no contenido — D5).
 * - letra normal: celda con numero de pista visible y letra en el centro.
 * - `activa`: pertenece a la palabra activa → input de 1 letra editable.
 * - `encontrada`: palabra resuelta → letra fija, resaltada (bg-amber), sin input.
 * - `tieneFoco`: la celda enfocada dentro de la palabra activa; el input se
 *   enfoca automáticamente (ref callback, determinista ante re-renders).
 * - `resaltada`: palabra recién encontrada (C-12/D4) → clase `animate-found`
 *   (keyframes del grupo 7; acá solo se usa el nombre de clase).
 *
 * Accesibilidad (C-12/D5): toda celda de letra expone `aria-label` desde
 * `describirCelda` (logica.ts, vitest) y un `id="celda-f-c"` que el tablero
 * usa para `scrollIntoView` (teclado virtual mobile). `touch-action:
 * manipulation` evita el zoom por doble-tap.
 *
 * La celda NO tiene lógica: toda la mecánica (auto-advance, Backspace,
 * flechas, validación) vive en `CrucigramaGame` vía `onTeclado`/`onCambio`.
 */

interface CeldaJuegoProps {
  /** Fila/columna 1-based del label (describirCelda) y del id de scroll. */
  fila: number;
  columna: number;
  letra: string;
  numero?: number | null;
  tipo: "letra" | "negra";
  activa: boolean;
  encontrada: boolean;
  /** Flash visual tras una respuesta incorrecta (400): celda en coral. */
  enError?: boolean;
  /** Celdas de la palabra recién encontrada (highlight temporal, C-12/D4). */
  resaltada?: boolean;
  tieneFoco: boolean;
  onCeldaClick: () => void;
  /** Letra tipeada (o borrado detectado por cambio de value) en el input. */
  onCambio: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Teclas no-texto del input activo: Backspace, flechas, Enter, Tab. */
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

  // Focus determinista: si esta celda ES la enfocada, el input se enfoca de
  // nuevo en cada render (un simple autoFocus no alcanza: el input de una
  // celda ya activa puede seguir montado al moverse el foco entre celdas).
  useEffect(() => {
    if (tieneFoco) {
      inputRef.current?.focus();
      // Fuerza el cursor al final (text-align center deja el caret raro).
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

  // Aria-label descriptivo (C-12/D5): número de pista, fila/columna 1-based y
  // estado (vacía / letra / encontrada / error) desde `describirCelda`.
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