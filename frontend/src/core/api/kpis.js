import apiClient from "@/core/api/apiClient";
import { ENDPOINTS } from "@/core/api/endpoints";

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
