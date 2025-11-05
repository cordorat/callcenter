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