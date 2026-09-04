import { api } from "./client";
import type { CredencialesLogin, CredencialesRegistro, Usuario } from "../types";

export const authApi = {
  registrar: (credenciales: CredencialesRegistro) =>
    api.post<Usuario>("/auth/registro", credenciales),

  login: (credenciales: CredencialesLogin) =>
    api.post<Usuario>("/auth/login", credenciales),

  logout: () => api.post<void>("/auth/logout"),

  getMe: () => api.get<Usuario>("/auth/me"),
};
