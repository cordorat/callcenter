// PATH: src/core/api/centros.js

import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';

/**
 * Servicio para gestionar Centros del Call Center
 * Solo accesible para usuarios con rol ADMIN
 */
export const centrosService = {
  /**
   * Obtiene la lista de centros con paginación
   * @param {Object} params - Parámetros de paginación y filtros
   * @returns {Promise} - Promesa con la lista de centros
   */
  getCentros: async ({ page = 1, page_size = 10, nombre = '', sin_jefe = false } = {}) => {
    try {
      const params = { page, page_size };
      if (nombre) params.nombre = nombre;
      if (sin_jefe) params.sin_jefe = 'true';
      
      const response = await apiClient.get(ENDPOINTS.CENTROS, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtiene un centro por ID
   * @param {number} centroId - ID del centro
   * @returns {Promise} - Promesa con los datos del centro
   */
  getCentroById: async (centroId) => {
    try {
      const response = await apiClient.get(`${ENDPOINTS.CENTROS}${centroId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Crea un nuevo centro
   * @param {Object} centroData - Datos del centro
   * @returns {Promise} - Promesa con la respuesta del servidor
   */
  createCentro: async (centroData) => {
    try {
      const response = await apiClient.post(ENDPOINTS.CENTROS, centroData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Actualiza un centro
   * @param {number} centroId - ID del centro
   * @param {Object} centroData - Datos actualizados
   * @returns {Promise} - Promesa con la respuesta del servidor
   */
  updateCentro: async (centroId, centroData) => {
    try {
      const response = await apiClient.patch(`${ENDPOINTS.CENTROS}${centroId}/`, centroData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Elimina un centro
   * @param {number} centroId - ID del centro
   * @returns {Promise} - Promesa con la respuesta del servidor
   */
  deleteCentro: async (centroId) => {
    try {
      const response = await apiClient.delete(`${ENDPOINTS.CENTROS}${centroId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtiene la lista de jefes de centro disponibles (sin centro asignado)
   * @returns {Promise} - Promesa con la lista de jefes disponibles
   */
  getJefesDisponibles: async () => {
    try {
      const response = await apiClient.get(`${ENDPOINTS.CENTROS}jefes-disponibles/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtiene una lista simplificada de centros para dropdowns
   * @returns {Promise} - Promesa con la lista simplificada de centros
   */
  getCentrosSimple: async () => {
    try {
      const response = await apiClient.get(`${ENDPOINTS.CENTROS}simple/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Asigna un jefe a un centro
   * @param {number} centroId - ID del centro
   * @param {string} jefeDocumentoId - Documento ID del jefe de centro
   * @returns {Promise} - Promesa con la respuesta del servidor
   */
  asignarJefe: async (centroId, jefeDocumentoId) => {
    try {
      const response = await apiClient.post(`${ENDPOINTS.CENTROS}${centroId}/asignar-jefe/`, {
        jefe_centro: jefeDocumentoId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Desasigna el jefe de un centro
   * @param {number} centroId - ID del centro
   * @returns {Promise} - Promesa con la respuesta del servidor
   */
  desasignarJefe: async (centroId) => {
    try {
      const response = await apiClient.post(`${ENDPOINTS.CENTROS}${centroId}/desasignar-jefe/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
