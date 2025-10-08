// PATH: src/core/api/endpoints.js

/**
 * Archivo central de endpoints del backend (Django REST Framework).
 * Sirve para mantener todas las rutas en un solo lugar.
 */

// URL base del backend (ambiente local por ahora)
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const ENDPOINTS = {
  // --- AUTH ---
  LOGIN: `${BASE_URL}/token/`,            // POST: obtiene tokens JWT (access + refresh)
  REFRESH: `${BASE_URL}/token/refresh/`,  // POST: renueva el access token cuando expira

  // --- USERS ---
  USERS: `${BASE_URL}/users/`,            // CRUD de usuarios (opcional más adelante)
  USER_ME: `${BASE_URL}/users/me/`,       // GET info del usuario autenticado
};
