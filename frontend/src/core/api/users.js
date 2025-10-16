// PATH: src/core/api/users.js

import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';

/**
 * Servicio para gestionar usuarios
 */
export const usersService = {
  /**
   * Crea un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise} - Promesa con la respuesta del servidor
   */
  createUser: async (userData) => {
    try {
      const response = await apiClient.post(ENDPOINTS.USERS, userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtiene la lista de usuarios
   * @returns {Promise} - Promesa con la lista de usuarios
   */
  getUsers: async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.USERS);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtiene un usuario por ID
   * @param {number} userId - ID del usuario
   * @returns {Promise} - Promesa con los datos del usuario
   */
  getUserById: async (userId) => {
    try {
      const response = await apiClient.get(`${ENDPOINTS.USERS}${userId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Actualiza un usuario
   * @param {number} userId - ID del usuario
   * @param {Object} userData - Datos actualizados
   * @returns {Promise} - Promesa con la respuesta del servidor
   */
  updateUser: async (userId, userData) => {
    try {
      const response = await apiClient.patch(`${ENDPOINTS.USERS}${userId}/`, userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Desactiva un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise} - Promesa con la respuesta del servidor
   */
  deleteUser: async (userId) => {
    try {
      const response = await apiClient.delete(`${ENDPOINTS.USERS}${userId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtiene la información del usuario actual
   * @returns {Promise} - Promesa con los datos del usuario actual
   */
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.USER_ME);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
