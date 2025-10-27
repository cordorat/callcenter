// PATH: src/core/api/calls.js
import apiClient from "./apiClient";
import { ENDPOINTS } from "./endpoints";

/**
 * Mapea los estados del UI al backend:
 * UI: contestada | no_contestada | fallida | todos
 * API: COMPLETADA | NO_CONTESTADA | FALLIDA | (omitido)
 */
const mapEstadoToBackend = (estadoUI) => {
  if (!estadoUI || estadoUI === "todos") return undefined;
  const map = {
    contestada: "COMPLETADA",
    no_contestada: "NO_CONTESTADA",
    fallida: "FALLIDA",
    // si agregas "rechazada" en el UI:
    rechazada: "RECHAZADA",
  };
  return map[estadoUI] || undefined;
};

export const callsService = {
  /**
   * Historial de llamadas del agente autenticado (paginado + filtros)
   * Params soportados por tu backend:
   * - fecha_desde (YYYY-MM-DD)
   * - fecha_hasta (YYYY-MM-DD)
   * - estado (COMPLETADA | NO_CONTESTADA | RECHAZADA | FALLIDA)
   * - telefono (string)
   * - cliente (string)
   * - page (int)
   * - page_size (int)
   */
  getHistory: async ({
    fecha_desde,
    fecha_hasta,
    estado,       // estado UI → se mapea adentro
    telefono,
    cliente,
    page = 1,
    page_size = 50,
  } = {}) => {
    const estadoBackend = mapEstadoToBackend(estado);
    const params = {
      fecha_desde,
      fecha_hasta,
      estado: estadoBackend,
      telefono,
      cliente,
      page,
      page_size,
    };

    const response = await apiClient.get(ENDPOINTS.CALLS_HISTORY, { params });
    return response.data; // { count, total_pages, current_page, page_size, results }
  },
};
