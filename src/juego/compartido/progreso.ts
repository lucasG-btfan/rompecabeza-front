export function idsEncontrados(
  palabras: { id: string; encontrada: boolean }[],
): Set<string> {
  const ids = new Set<string>();
  for (const p of palabras) {
    if (p.encontrada) ids.add(p.id);
  }
  return ids;
}