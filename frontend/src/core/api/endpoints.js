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
  USER_PROFILE: `${BASE_URL}/users/profile/`,

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
  CALLS_HISTORY: `${BASE_URL}/calls/llamadas/historial/`,
  
  // Historial Jefe de Campaña
  CALLS_HISTORY_JEFE: `${BASE_URL}/calls/historial-jefecampana/`,
  CALLS_HISTORY_JEFE_DETAIL: (id) => `${BASE_URL}/calls/historial-jefecampana/${id}/`,
  CALLS_HISTORY_JEFE_CAMPANAS: `${BASE_URL}/calls/historial-jefecampana/mis-campanas/`,

  // --- KPIs ---  
  KPIS_OVERVIEW: `${BASE_URL}/kpis/overview/`,     // GET ?from=YYYY-MM-DD&to=YYYY-MM-DD
  // (opcional) series adicionales:
  KPIS_BY_HOUR: `${BASE_URL}/kpis/by-hour/`,       // GET ?from=&to=
  KPIS_TARGETS: `${BASE_URL}/kpis/targets/`,       // GET metas del agente
  
  // KPIs Coordinador
  KPIS_AGENTES: `${BASE_URL}/kpis/agentes/`,       // GET lista de agentes
  KPIS_AGENTE_DETALLE: (documentoId) => `${BASE_URL}/kpis/agentes/${documentoId}/detalle/`, // GET detalle de agente
  KPIS_EQUIPO_OVERVIEW: `${BASE_URL}/kpis/equipo/overview/`, // GET KPIs agregados del equipo
  KPIS_COORDINADOR_OVERVIEW: `${BASE_URL}/kpis/coordinador/overview/`, // GET KPIs del equipo del coordinador
  KPIS_COORDINADOR_EXPORTAR_PDF: `${BASE_URL}/kpis/coordinador/exportar-pdf/`, // GET Exportar KPIs a PDF
  
  // KPIs Jefe de Campaña
  KPIS_CAMPANA_OVERVIEW: `${BASE_URL}/kpis/campana/overview/`, // GET KPIs de campaña
  KPIS_JEFE_EQUIPOS_LIST: `${BASE_URL}/kpis/jefe-campana/equipos/`, // GET lista de equipos
  KPIS_JEFE_EQUIPO_DETALLE: (equipoId) => `${BASE_URL}/kpis/jefe-campana/equipos/${equipoId}/detalle/`, // GET KPIs de equipo
  
  // KPIs Jefe de Centro
  KPIS_JEFE_CENTRO_CAMPANAS: `${BASE_URL}/kpis/jefe-centro/campanas/`, // GET KPIs de todas las campañas del centro
  KPIS_JEFE_CENTRO_EQUIPOS_LIST: `${BASE_URL}/kpis/jefe-centro/equipos/`, // GET lista de equipos del centro
  KPIS_JEFE_CENTRO_EQUIPO_DETALLE: (equipoId) => `${BASE_URL}/kpis/jefe-centro/equipos/${equipoId}/detalle/`, // GET KPIs de equipo
  
  // --- CAMPAIGNS / BASES DE DATOS ---
  CAMPAIGNS_UPLOAD: `${BASE_URL}/campaigns/cargar-base-datos/`,    // POST multipart file + campana_id
  CAMPAIGNS_LIST: `${BASE_URL}/campaigns/listar-bases-datos/`,     // GET paginado
  CAMPAIGNS_DETAIL: (id) => `${BASE_URL}/campaigns/base-datos/${id}/`, // GET detalle
  CAMPAIGNS_RECORDS: (id) => `${BASE_URL}/campaigns/cargar-bd-registros/${id}/`, // GET registros paginados
};
