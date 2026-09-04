import { LetterTile } from "./LetterTile";

export function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        <LetterTile letra="R" delayMs={0} />
        <LetterTile letra="C" delayMs={90} />
      </div>
      <span className="font-display text-xl italic text-ink">Rompecabezas</span>
    </div>
  );
}
