import { api } from "./client";
import type { PartidaLobby } from "../types";

/** API del lobby (C-17) — listado público anti-cheat de partidas activas. */
export const lobbyApi = {
  /** GET /lobby/partidas: partidas `activo` ordenadas por `creado_en` desc.
   *  Accesible sin sesión (invitados); con sesión excluye las propias y las
   *  que tienen un duelo activo del usuario. */
  listar: () => api.get<PartidaLobby[]>("/lobby/partidas"),
};