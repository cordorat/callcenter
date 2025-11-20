import apiClient from "@/core/api/apiClient";
import { ENDPOINTS } from "@/core/api/endpoints";

// KPIs del agente autenticado (existentes)
export async function getKpiOverview({ from, to }) {
  const { data } = await apiClient.get(ENDPOINTS.KPIS_OVERVIEW, { params: { from, to } });
  return data;
}

export async function getKpisByHour({ from, to }) {
  const { data } = await apiClient.get(ENDPOINTS.KPIS_BY_HOUR, { params: { from, to } });
  return data;
}

export async function getKpiTargets() {
  const { data } = await apiClient.get(ENDPOINTS.KPIS_TARGETS);
  return data;
}

// KPIs para Coordinador - Listar agentes
export async function getAgentes() {
  const { data } = await apiClient.get(ENDPOINTS.KPIS_AGENTES);
  return data;
}

// KPIs para Coordinador - Detalle de agente
export async function getAgenteKpiDetail(documentoId, { fecha_desde, fecha_hasta }) {
  const { data } = await apiClient.get(
    ENDPOINTS.KPIS_AGENTE_DETALLE(documentoId),
    {
      params: { fecha_desde, fecha_hasta }
    }
  );
  return data;
}

// KPIs para Coordinador - Overview del equipo
export async function getEquipoKpiOverview({ from, to }) {
  const { data } = await apiClient.get(ENDPOINTS.KPIS_EQUIPO_OVERVIEW, { params: { from, to } });
  return data;
}

// KPIs para Coordinador - Overview completo con todos los KPIs
export async function getCoordinadorKpiOverview({ fecha_desde, fecha_hasta }) {
  const params = {};
  if (fecha_desde) params.fecha_desde = fecha_desde;
  if (fecha_hasta) params.fecha_hasta = fecha_hasta;
  
  const { data } = await apiClient.get(ENDPOINTS.KPIS_COORDINADOR_OVERVIEW, { params });
  return data;
}

// KPIs para Jefe de Campaña - Overview de campaña
export async function getCampanaKpiOverview({ campana_id, fecha_desde, fecha_hasta }) {
  const params = {};
  if (campana_id) params.campana_id = campana_id;
  if (fecha_desde) params.fecha_desde = fecha_desde;
  if (fecha_hasta) params.fecha_hasta = fecha_hasta;
  
  const { data } = await apiClient.get(ENDPOINTS.KPIS_CAMPANA_OVERVIEW, { params });
  return data;
}

// KPIs para Jefe de Campaña - Lista de equipos
export async function getEquiposJefeCampana({ campana_id, page = 1, page_size = 10 }) {
  const params = { page, page_size };
  if (campana_id) params.campana_id = campana_id;
  
  const { data } = await apiClient.get(ENDPOINTS.KPIS_JEFE_EQUIPOS_LIST, { params });
  return data;
}

// KPIs para Jefe de Campaña - Detalle de equipo
export async function getEquipoKpiDetalle(equipoId, { fecha_desde, fecha_hasta }) {
  const params = {};
  if (fecha_desde) params.fecha_desde = fecha_desde;
  if (fecha_hasta) params.fecha_hasta = fecha_hasta;
  
  const { data } = await apiClient.get(ENDPOINTS.KPIS_JEFE_EQUIPO_DETALLE(equipoId), { params });
  return data;
}

// Exportar KPIs del coordinador a PDF
export async function exportarCoordinadorKpisPDF({ fecha_desde, fecha_hasta }) {
  const params = {};
  if (fecha_desde) params.fecha_desde = fecha_desde;
  if (fecha_hasta) params.fecha_hasta = fecha_hasta;
  
  const response = await apiClient.get(ENDPOINTS.KPIS_COORDINADOR_EXPORTAR_PDF, { 
    params,
    responseType: 'blob' 
  });
  return response;
}

// KPIs para Jefe de Centro - Campañas del centro
export async function getJefeCentroCampanasKpi({ campana_id, fecha_desde, fecha_hasta }) {
  const params = {};
  if (campana_id) params.campana_id = campana_id;
  if (fecha_desde) params.fecha_desde = fecha_desde;
  if (fecha_hasta) params.fecha_hasta = fecha_hasta;
  
  const { data } = await apiClient.get(ENDPOINTS.KPIS_JEFE_CENTRO_CAMPANAS, { params });
  return data;
}