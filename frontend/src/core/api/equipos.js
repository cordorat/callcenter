// Path: frontend/src/core/api/equipos.js

import apiClient from "./apiClient";

/**
 * API Client para gestión de equipos de trabajo.
 * Solo accesible para usuarios con rol JEFE_CENTRO.
 */

/**
 * Obtiene la lista de equipos del jefe de centro autenticado.
 * Si el usuario es COORDINADOR, solo obtiene los equipos que coordina.
 * @param {Object} params - Parámetros de filtrado opcionales
 * @param {number} params.campana_id - Filtrar por ID de campaña
 * @param {string} params.search - Buscar por nombre de equipo o campaña
 * @param {number} params.page - Número de página (por defecto 1)
 * @param {number} params.page_size - Cantidad de registros por página (por defecto 10)
 * @returns {Promise<Object>} { success, count, page, page_size, total_pages, equipos }
 */
export const getEquipos = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.campana_id) queryParams.append('campana_id', params.campana_id);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    
    const url = `/campaigns/equipos/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('[API Equipos] Error obteniendo equipos:', error);
    throw error;
  }
};

/**
 * Obtiene el detalle de un equipo específico.
 * @param {number} equipoId - ID del equipo
 * @returns {Promise<Object>} { success, equipo }
 */
export const getEquipo = async (equipoId) => {
  try {
    const response = await apiClient.get(`/campaigns/equipos/${equipoId}/`);
    return response.data;
  } catch (error) {
    console.error('[API Equipos] Error obteniendo equipo:', error);
    throw error;
  }
};

/**
 * Crea un nuevo equipo de trabajo.
 * @param {Object} data - Datos del equipo
 * @param {string} data.nombre - Nombre del equipo (requerido)
 * @param {number} data.campana - ID de la campaña (requerido)
 * @param {string[]} data.agentes_ids - Array de documento_id de agentes (requerido)
 * @returns {Promise<Object>} { success, message, equipo }
 */
export const createEquipo = async (data) => {
  try {
    const response = await apiClient.post('/campaigns/equipos/', data);
    return response.data;
  } catch (error) {
    console.error('[API Equipos] Error creando equipo:', error);
    throw error;
  }
};

/**
 * Actualiza un equipo existente.
 * @param {number} equipoId - ID del equipo
 * @param {Object} data - Datos a actualizar
 * @param {string} data.nombre - Nombre del equipo (opcional)
 * @param {number} data.campana - ID de la campaña (opcional)
 * @param {string[]} data.agentes_ids - Array de documento_id de agentes (opcional)
 * @returns {Promise<Object>} { success, message, equipo }
 */
export const updateEquipo = async (equipoId, data) => {
  try {
    const response = await apiClient.patch(`/campaigns/equipos/${equipoId}/`, data);
    return response.data;
  } catch (error) {
    console.error('[API Equipos] Error actualizando equipo:', error);
    throw error;
  }
};

/**
 * Elimina un equipo (soft delete).
 * @param {number} equipoId - ID del equipo
 * @returns {Promise<Object>} { success, message }
 */
export const deleteEquipo = async (equipoId) => {
  try {
    const response = await apiClient.delete(`/campaigns/equipos/${equipoId}/`);
    return { success: true, message: 'Equipo eliminado correctamente' };
  } catch (error) {
    console.error('[API Equipos] Error eliminando equipo:', error);
    throw error;
  }
};

/**
 * Obtiene agentes disponibles (sin equipo activo) con búsqueda en tiempo real.
 * @param {string} search - Texto para buscar por nombre, apellido o código
 * @returns {Promise<Object>} { success, count, agentes }
 */
export const getAgentesDisponibles = async (search = '') => {
  try {
    const url = `/campaigns/equipos/agentes-disponibles/${search ? '?search=' + encodeURIComponent(search) : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('[API Equipos] Error obteniendo agentes disponibles:', error);
    throw error;
  }
};

/**
 * Obtiene campañas activas disponibles para asignar a equipos.
 * @returns {Promise<Object>} { success, count, campanas }
 */
export const getCampanasActivas = async () => {
  try {
    const response = await apiClient.get('/campaigns/equipos/campanas-activas/');
    return response.data;
  } catch (error) {
    console.error('[API Equipos] Error obteniendo campañas activas:', error);
    throw error;
  }
};

/**
 * Obtiene coordinadores disponibles para asignar a equipos.
 * @returns {Promise<Object>} { success, count, coordinadores }
 */
export const getCoordinadoresDisponibles = async () => {
  try {
    const response = await apiClient.get('/campaigns/equipos/coordinadores-disponibles/');
    return response.data;
  } catch (error) {
    console.error('[API Equipos] Error obteniendo coordinadores:', error);
    throw error;
  }
};
