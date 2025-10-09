// PATH: src/core/api/endpoints.js

/**
 * Archivo central de endpoints del backend (Django REST Framework).
 * Sirve para mantener todas las rutas en un solo lugar.
 */

// URL base del backend (ambiente local por ahora)
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const ENDPOINTS = {
  // --- AUTH ---
  LOGIN: `${BASE_URL}/auth/login/`,       // POST: obtiene tokens JWT (access + refresh) + datos de usuario
  REFRESH: `${BASE_URL}/auth/refresh/`,   // POST: renueva el access token cuando expira
  LOGOUT: `${BASE_URL}/auth/logout/`,     // POST: cierra sesión (blacklist del refresh token)

  // --- USERS ---
  USERS: `${BASE_URL}/users/`,            // CRUD de usuarios (opcional más adelante)
  USER_ME: `${BASE_URL}/users/me/`,       // GET info del usuario autenticado

  // --- CALLS ---
  CALLS: `${BASE_URL}/calls/`,                    
  CALLS_DETAIL: (id) => `${BASE_URL}/calls/${id}/`, 
  CALLS_ONCALL: `${BASE_URL}/calls/oncall/`,    
  CALLS_HANGOUT: `${BASE_URL}/calls/hangout/`,   
};
