import apiClient from "@/core/api/apiClient";
import { ENDPOINTS } from "@/core/api/endpoints";

// Nota: el backend expone los endpoints de comisiones bajo /api/calls/comisiones/
const BASE = `${ENDPOINTS.CALLS}comisiones/`;

/**
 * Lista las comisiones del agente autenticado.
 * params: { periodo, fecha_desde, fecha_hasta, page, page_size }
 */
export async function getComisiones({ periodo = 'mes', fecha_desde, fecha_hasta, page = 1, page_size = 20 } = {}) {
  const params = { periodo, page, page_size };
  if (fecha_desde) params.fecha_desde = fecha_desde;
  if (fecha_hasta) params.fecha_hasta = fecha_hasta;

  const { data } = await apiClient.get(BASE, { params });
  return data;
}

/**
 * Obtiene el detalle de una comisión por id
 */
export async function getComisionDetail(comisionId) {
  const { data } = await apiClient.get(`${BASE}${comisionId}/`);
  return data;
}

/**
 * Obtiene un resumen de comisiones (totales, cantidad, promedio, etc.)
 * Query params: periodo, fecha_desde, fecha_hasta
 */
export async function getComisionesResumen({ periodo = 'mes', fecha_desde, fecha_hasta } = {}) {
  const params = { periodo };
  if (fecha_desde) params.fecha_desde = fecha_desde;
  if (fecha_hasta) params.fecha_hasta = fecha_hasta;

  const { data } = await apiClient.get(`${BASE}resumen/`, { params });
  return data;
}

/**
 * Helper: descarga un blob con un resumen exportable (si en el futuro se añade)
 * - Esta función está preparada para usarse si se añade un endpoint de export.
 */
export async function exportComisionesBlob({ params = {}, endpoint = `${BASE}export/` } = {}) {
  // Nota: actualmente el backend no expone /export/ para comisiones.
  const response = await apiClient.get(endpoint, { params, responseType: 'blob' });
  return response;
}
