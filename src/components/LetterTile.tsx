interface LetterTileProps {
  letra: string;
  delayMs?: number;
  size?: "sm" | "md";
}

export function LetterTile({ letra, delayMs = 0, size = "md" }: LetterTileProps) {
  const dimensiones = size === "sm" ? "h-9 w-9 text-lg" : "h-14 w-14 text-2xl";

  return (
    <span
      className={`animate-tile-drop inline-flex ${dimensiones} -rotate-2 items-center justify-center rounded-md bg-tile font-display font-semibold text-ink shadow-[3px_3px_0_0_rgba(0,0,0,0.25)]`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {letra}
    </span>
  );
}
