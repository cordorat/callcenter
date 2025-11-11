// PATH: src/core/api/calls.js
import apiClient from "./apiClient";
import { ENDPOINTS } from "./endpoints";

/**
 * Mapea los estados del UI al backend:
 * UI: completada | no_contestada | rechazada | colgada | ocupado | error | todos
 * API: COMPLETADA (vía fue_contestada=true) | NO_CONTESTADA | RECHAZADA | COLGADA | OCUPADO | ERROR
 */
const mapEstadoToBackend = (estadoUI) => {
  if (!estadoUI || estadoUI === "todos") return undefined;
  const map = {
    completada: "COMPLETADA",
    no_contestada: "NO_CONTESTADA",
    rechazada: "RECHAZADA",
    colgada: "COLGADA",
    ocupado: "OCUPADO",
    error: "ERROR",
  };
  return map[estadoUI] || undefined;
};

export const callsService = {
  /**
   * Historial de llamadas del agente autenticado (paginado + filtros)
   * Params soportados por tu backend:
   * - fecha_desde (YYYY-MM-DD)
   * - fecha_hasta (YYYY-MM-DD)
   * - estado (COMPLETADA | NO_CONTESTADA | RECHAZADA | COLGADA | OCUPADO | ERROR)
   * - fue_contestada (true | false) - Filtrar por llamadas realmente contestadas
   * - telefono (string)
   * - cliente (string)
   * - page (int)
   * - page_size (int)
   */
  getHistory: async ({
    fecha_desde,
    fecha_hasta,
    estado,       // Ya viene en formato correcto desde el componente
    fue_contestada, // boolean - filtrar por llamadas contestadas
    telefono,
    cliente,
    agente_nombre, // Filtrar por nombre del agente (first_name o last_name)
    estado_reportada, // NO_REPORTADA | REPORTADA
    estado_auditoria,  // NO_AUDITADA | AUDITADA
    page = 1,
    page_size = 50,
  } = {}) => {
    // Construir params solo con valores definidos
    const params = {};
    
    if (fecha_desde) params.fecha_desde = fecha_desde;
    if (fecha_hasta) params.fecha_hasta = fecha_hasta;
    if (estado) params.estado = estado;
    if (fue_contestada !== undefined) params.fue_contestada = fue_contestada;
    if (telefono) params.telefono = telefono;
    if (cliente) params.cliente = cliente;
    if (agente_nombre) params.agente_nombre = agente_nombre;
    if (estado_reportada) params.estado_reportada = estado_reportada;
    if (estado_auditoria) params.estado_auditoria = estado_auditoria;
    if (page) params.page = page;
    if (page_size) params.page_size = page_size;

    const response = await apiClient.get(ENDPOINTS.CALLS_HISTORY, { params });
    return response.data; // { count, total_pages, current_page, page_size, results }
  },

  /**
   * Marca una llamada como auditada
   * POST /api/calls/llamadas/{id}/marcar-auditada/
   * 
   * @param {number} llamadaId - ID de la llamada
   * @param {string} notas_auditoria - Notas opcionales del auditor
   * @returns {Promise} Respuesta del backend con confirmación
   */
  auditCall: async (llamadaId, notas_auditoria = "") => {
    const url = `${ENDPOINTS.CALLS}llamadas/${llamadaId}/marcar-auditada/`;
    const payload = notas_auditoria ? { notas_auditoria } : {};
    
    const response = await apiClient.post(url, payload);
    return response.data;
  },

  /**
   * Reporta un problema en una llamada
   * POST /api/calls/llamadas/{id}/reportar/
   * 
   * @param {number} llamadaId - ID de la llamada
   * @param {string} descripcion - Descripción del problema (10-500 caracteres)
   * @returns {Promise} Respuesta del backend con datos del reporte
   */
  reportCall: async (llamadaId, descripcion) => {
    const url = `${ENDPOINTS.CALLS}llamadas/${llamadaId}/reportar/`;
    
    const response = await apiClient.post(url, { descripcion });
    return response.data;
  },
};
