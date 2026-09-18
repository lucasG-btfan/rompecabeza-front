
export function siguienteIndice(actual: number, total: number): number {
  if (total <= 1) return 0;
  return (actual + 1) % total;
}

export function anteriorIndice(actual: number, total: number): number {
  if (total <= 1) return 0;
  return (actual - 1 + total) % total;
}