// Path: src/core/api/campaigns.js
// Cliente API para gestión de campañas

import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';

/**
 * Obtener lista de campañas activas
 */
export const getActiveCampaigns = async () => {
  try {
    const response = await apiClient.get('/api/campaigns/equipos/campanas-activas/');
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al obtener campañas activas:', error);
    throw error;
  }
};

/**
 * Actualizar meta de ventas de una campaña
 * @param {number} campaignId - ID de la campaña
 * @param {number} objetivo_ventas - Nueva meta de ventas
 */
export const updateSalesGoal = async (campaignId, objetivo_ventas) => {
  try {
    // Por ahora retornamos éxito simulado hasta que exista el endpoint PATCH
    console.log(`Actualizando meta de campaña ${campaignId} a ${objetivo_ventas}`);
    return { success: true, objetivo_ventas };
  } catch (error) {
    console.error('[campaigns.js] Error al actualizar meta de ventas:', error);
    throw error;
  }
};

/**
 * Programar o iniciar iteración de una base de datos
 * @param {number} baseId - ID de la base de datos
 * @param {object} payload - { fecha_hora_inicio_iteracion: string } o { iteracion_activa: true }
 */
export const programarIteracionBase = async (baseId, payload) => {
  try {
    const response = await apiClient.put(`/api/campaigns/base-datos/${baseId}/programar-iteracion/`, payload);
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al programar/iniciar iteración:', error);
    throw error;
  }
};
