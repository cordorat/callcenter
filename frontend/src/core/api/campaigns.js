// Path: src/core/api/campaigns.js
// Cliente API para gestión de campañas

import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';

/**
 * Obtener lista de todas las campañas
 * @param {Object} params - Parámetros opcionales para filtrar o paginar
 * @returns {Promise<Object>} { success, campanas }
 */
export const getCampaigns = async (params = {}) => {
  try {
    const response = await apiClient.get('/campaigns/', { params });
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al obtener campañas:', error);
    throw error;
  }
};

/**
 * Crear una nueva campaña
 * @param {Object} data - Datos de la campaña
 * @returns {Promise<Object>} { message, data }
 */
export const createCampaign = async (data) => {
  try {
    const response = await apiClient.post('/campaigns/', data);
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al crear campaña:', error);
    throw error;
  }
};

/**
 * Buscar jefes de campaña en tiempo real
 * @param {string} query - Término de búsqueda (nombre o código)
 * @returns {Promise<Array>} Lista de jefes de campaña
 */
export const searchJefesCampana = async (query) => {
  try {
    const response = await apiClient.get('/campaigns/buscar-jefes/', {
      params: { q: query }
    });
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al buscar jefes de campaña:', error);
    throw error;
  }
};

/**
 * Obtener productos activos disponibles
 * @returns {Promise<Object>} { success, productos }
 */
export const getProductosActivos = async () => {
  try {
    const response = await apiClient.get('/campaigns/productos/');
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al obtener productos:', error);
    throw error;
  }
};

/**
 * Obtener lista de campañas activas
 */
export const getActiveCampaigns = async () => {
  try {
    const response = await apiClient.get('/campaigns/equipos/campanas-activas/');
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al obtener campañas activas:', error);
    throw error;
  }
};

/**
 * Obtener campañas del jefe de campaña autenticado con equipos y agentes
 * @returns {Promise<Object>} { success, count, campanas }
 */
export const getMisCampanasJefe = async () => {
  try {
    const response = await apiClient.get('/campaigns/equipos/jefe-campana/mis-campanas/');
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al obtener mis campañas:', error);
    throw error;
  }
};

/**
 * Listar bases de datos con filtro opcional por campaña
 * @param {number|null} campanaId - ID de la campaña para filtrar (opcional)
 * @param {number} page - Número de página (default: 1)
 * @returns {Promise<Object>} { count, total_pages, current_page, page_size, results, filtered_by_campana }
 */
export const listarBasesDatos = async (campanaId = null, page = 1) => {
  try {
    const params = { page };
    if (campanaId) {
      params.campana_id = campanaId;
    }
    const response = await apiClient.get('/campaigns/listar-bases-datos/', { params });
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al listar bases de datos:', error);
    throw error;
  }
};

/**
 * Asignar coordinador a un equipo
 * @param {number} equipoId - ID del equipo
 * @param {string} agenteId - documento_id del agente
 * @param {boolean} confirmar - true para confirmar el reemplazo si ya hay coordinador
 * @returns {Promise<Object>} { success, requiere_confirmacion, coordinador_anterior, nuevo_coordinador, message }
 */
export const asignarCoordinador = async (equipoId, agenteId, confirmar = false) => {
  try {
    const response = await apiClient.post(
      `/campaigns/equipos/${equipoId}/asignar-coordinador/`,
      { agente_id: agenteId, confirmar }
    );
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al asignar coordinador:', error);
    throw error;
  }
};

/**
 * Actualizar meta de ventas de una campaña
 * @param {number} campaignId - ID de la campaña
 * @param {number} objetivo_ventas - Nueva meta de ventas
 * @returns {Promise<Object>} { success, message, objetivo_ventas }
 */
export const updateSalesGoal = async (campaignId, objetivo_ventas) => {
  try {
    console.log('[campaigns.js] Actualizando meta - campaignId:', campaignId, 'objetivo_ventas:', objetivo_ventas);
    console.log('[campaigns.js] URL:', `/campaigns/campanas/${campaignId}/actualizar-objetivo/`);
    const response = await apiClient.patch(
      `/campaigns/campanas/${campaignId}/actualizar-objetivo/`,
      { objetivo_ventas }
    );
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al actualizar meta de ventas:', error);
    console.error('[campaigns.js] Error response:', error.response?.data);
    console.error('[campaigns.js] Error status:', error.response?.status);
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
    const response = await apiClient.put(`/campaigns/base-datos/${baseId}/programar-iteracion/`, payload);
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al programar/iniciar iteración:', error);
    throw error;
  }
};

/**
 * Eliminar una base de datos cargada
 * @param {number} baseId - ID de la base de datos a eliminar
 * @returns {Promise<Object>} { success, message, registros_eliminados }
 */
export const eliminarBaseDatos = async (baseId) => {
  try {
    const response = await apiClient.delete(`/campaigns/base-datos/${baseId}/eliminar/`);
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al eliminar base de datos:', error);
    throw error;
  }
};

/**
 * Listar bases de datos de una campaña específica
 * @param {number} campanaId - ID de la campaña
 * @returns {Promise<Object>} { count, campana, bases_datos }
 */
export const getBasesDatosPorCampana = async (campanaId) => {
  try {
    const response = await apiClient.get('/campaigns/bases-datos/por-campana/', {
      params: { campana_id: campanaId }
    });
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al obtener bases de datos por campaña:', error);
    throw error;
  }
};

/**
 * Listar clientes de una base de datos específica
 * @param {number} baseDatosId - ID de la base de datos
 * @param {Object} params - Parámetros opcionales: { search, telefono, page, page_size }
 * @returns {Promise<Object>} { count, total_pages, current_page, page_size, base_datos, results }
 */
export const getClientesPorBaseDatos = async (baseDatosId, params = {}) => {
  try {
    const response = await apiClient.get('/calls/clientes/por-base-datos/', {
      params: {
        base_datos_id: baseDatosId,
        ...params
      }
    });
    return response.data;
  } catch (error) {
    console.error('[campaigns.js] Error al obtener clientes por base de datos:', error);
    throw error;
  }
};
