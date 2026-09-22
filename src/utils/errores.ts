export interface ErrorConStatus {
  status?: number;
  message?: string;
}

const GENERICO = "Algo salió mal. Probá de nuevo.";

export function mensajeError(e: ErrorConStatus | null | undefined): string {
  if (e == null) return GENERICO;
  if (e.status === 404) return "La partida no existe o el código es incorrecto";
  if (e.status === 500) return "Hubo un problema en el servidor, probá de nuevo";
  return e.message || GENERICO;
}