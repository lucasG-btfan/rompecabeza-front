/**
 * Contratos de autenticación — espejo de app/schemas/usuario.py del backend.
 * Estos tipos son el "contrato" con la API: si el backend cambia, cambia acá
 * (y en api/) sin tocar la UI.
 */

export interface Usuario {
  id: string;
  username: string;
  creado_en: string; // ISO date (datetime del backend)
}

export interface CredencialesLogin {
  username: string;
  password: string;
}

export interface CredencialesRegistro {
  username: string;
  password: string;
}
