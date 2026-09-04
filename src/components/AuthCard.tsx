import type { ReactNode } from "react";
import { Wordmark } from "./Wordmark";

interface AuthCardProps {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  pie: ReactNode;
}

export function AuthCard({ titulo, subtitulo, children, pie }: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Wordmark />
      </div>

      <div className="w-full max-w-sm rounded-lg border border-line bg-tile-light/[0.04] bg-tile p-8 text-ink shadow-[6px_6px_0_0_rgba(0,0,0,0.25)]">
        <h1 className="font-display text-2xl text-ink">{titulo}</h1>
        <p className="mt-1 text-sm text-ink-soft">{subtitulo}</p>

        <div className="mt-6">{children}</div>
      </div>

      <p className="mt-6 text-sm text-ink-soft">{pie}</p>
    </div>
  );
}
