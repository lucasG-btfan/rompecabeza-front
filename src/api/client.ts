const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    // Manda y recibe la cookie de sesión httponly. Sin esto, el backend
    // nunca ve la cookie y todo se trata como invitado/no-autenticado.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body?.detail)) {
        // Los 422 de FastAPI/Pydantic traen `detail` como ARRAY de errores
        // ({loc, msg, type}). El statusText ("Unprocessable Content") no dice
        // nada útil — formateamos el detalle real, ej: "fila: Input should be
        // greater than or equal to 0".
        detail = body.detail
          .map(
            (e: { loc?: unknown[]; msg?: string }) =>
              `${[...(e.loc ?? [])].filter((p) => typeof p === "string").join(".")}: ${e.msg ?? "error de validación"}`,
          )
          .join(" · ");
      }
    } catch {
      // La respuesta no era JSON (poco común); usamos el statusText.
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
