// PATH: src/core/api/historialJefe.js
import apiClient from "./apiClient";
import { ENDPOINTS } from "./endpoints";

/**
 * Servicio para el historial de llamadas del Jefe de Campaña
 * Incluye filtros avanzados y acceso a todas las llamadas de sus campañas
 */
export const historialJefeService = {
  /**
   * Obtener campañas asignadas al jefe de campaña
   * Retorna lista de campañas para el selector del frontend
   */
  getMisCampanas: async () => {
    const response = await apiClient.get(ENDPOINTS.CALLS_HISTORY_JEFE_CAMPANAS);
    return response.data; // { count, campanas: [...] }
  },

  /**
   * Historial de llamadas de las campañas del jefe (paginado + filtros)
   * Params soportados:
   * - campana_id (int) - Filtrar por campaña específica
   * - agente_nombre (string) - Búsqueda por nombre del agente
   * - telefono (string) - Búsqueda por teléfono
   * - fue_contestada (boolean) - Filtrar por contestadas/no contestadas
   * - estado_llamada (string) - COMPLETADA | NO_CONTESTADA | RECHAZADA | etc.
   * - fecha_desde (YYYY-MM-DD) - Fecha inicio
   * - fecha_hasta (YYYY-MM-DD) - Fecha fin
   * - page (int) - Número de página (default: 1)
   * - page_size (int) - Tamaño de página (default: 6, max: 100)
   */
  getHistorial: async ({
    campana_id,
    agente_nombre,
    telefono,
    fue_contestada,
    estado_llamada,
    fecha_desde,
    fecha_hasta,
    page = 1,
    page_size = 6,
  } = {}) => {
    // Construir params solo con valores definidos
    const params = {};
    
    if (campana_id) params.campana_id = campana_id;
    if (agente_nombre) params.agente_nombre = agente_nombre;
    if (telefono) params.telefono = telefono;
    if (fue_contestada !== undefined) params.fue_contestada = fue_contestada;
    if (estado_llamada) params.estado_llamada = estado_llamada;
    if (fecha_desde) params.fecha_desde = fecha_desde;
    if (fecha_hasta) params.fecha_hasta = fecha_hasta;
    if (page) params.page = page;
    if (page_size) params.page_size = page_size;

    const response = await apiClient.get(ENDPOINTS.CALLS_HISTORY_JEFE, { params });
    return response.data; // { count, total_pages, current_page, page_size, results }
  },

  /**
   * Obtener detalle de una llamada específica
   * @param {number} id - ID de la llamada
   */
  getDetalle: async (id) => {
    const response = await apiClient.get(ENDPOINTS.CALLS_HISTORY_JEFE_DETAIL(id));
    return response.data;
  },
};
