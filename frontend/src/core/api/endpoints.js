// PATH: src/core/api/endpoints.js

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const ENDPOINTS = {
  // --- AUTH ---
  LOGIN: `${BASE_URL}/auth/login/`,
  REFRESH: `${BASE_URL}/auth/refresh/`,
  LOGOUT: `${BASE_URL}/auth/logout/`,

  // --- USERS ---
  USERS: `${BASE_URL}/users/`,
  USER_ME: `${BASE_URL}/users/me/`,

  // --- AGENT STATES ---
  AGENT_STATES_CURRENT: `${BASE_URL}/users/estados/current/`,
  AGENT_STATES_CHANGE: `${BASE_URL}/users/estados/change_state/`,
  AGENT_STATES_HISTORY: `${BASE_URL}/users/estados/historial/`,
  AGENT_STATES_AVAILABLE: `${BASE_URL}/users/estados/disponibles/`,
  AGENT_STATES_ALL: `${BASE_URL}/users/estados/todos/`,

  // --- CALLS ---
  CALLS: `${BASE_URL}/calls/`,
  CALLS_DETAIL: (id) => `${BASE_URL}/calls/${id}/`,
  CALLS_ONCALL: `${BASE_URL}/calls/oncall/`,
  CALLS_HANGOUT: `${BASE_URL}/calls/hangout/`,

  // --- KPIs ---  ⬅️ NUEVO
  KPIS_OVERVIEW: `${BASE_URL}/kpis/overview/`,     // GET ?from=YYYY-MM-DD&to=YYYY-MM-DD
  // (opcional) series adicionales:
  KPIS_BY_HOUR: `${BASE_URL}/kpis/by-hour/`,       // GET ?from=&to=
  KPIS_TARGETS: `${BASE_URL}/kpis/targets/`,       // GET metas del agente
};
