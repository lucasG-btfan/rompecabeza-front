import type { ButtonHTMLAttributes } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  cargando?: boolean;
}

export function PrimaryButton({
  cargando,
  children,
  disabled,
  className,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={`inline-flex w-full items-center justify-center rounded-md bg-amber px-4 py-2.5 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(36,28,21,0.35)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${className ?? ""}`}
      disabled={disabled || cargando}
      {...props}
    >
      {cargando ? "Un momento…" : children}
    </button>
  );
}
