import apiClient from "./apiClient";

/**
 * API Client para gestión de campañas.
 */

/**
 * Obtiene la lista de campañas.
 * @param {Object} params - Parámetros opcionales para filtrar o paginar.
 * @returns {Promise<Object>} { success, count, results }
 */
export const getCampaings = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/campaigns/campanas/', { params });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo las campañas:', error);
    throw error;
  }
};

