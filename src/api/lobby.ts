import { api } from "./client";
import type { PartidaLobby } from "../types";

export const lobbyApi = {
  listar: () => api.get<PartidaLobby[]>("/lobby/partidas"),
};