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
  getUsers: async ({ page = 1, page_size = 10 } = {}) => {
    try {
      const response = await apiClient.get(ENDPOINTS.USERS, {
        params: { page, page_size }
      });
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
  },
  /**
 * Actualiza la información del perfil del usuario autenticado
 * @param {Object} profileData - Datos del perfil (first_name, last_name, phone, foto_perfil)
 * @returns {Promise} - Promesa con la respuesta del servidor
 */
  updateProfile: async (profileData) => {
    try {
      const response = await apiClient.patch(ENDPOINTS.USER_PROFILE, profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cambia la contraseña del usuario autenticado
   * @param {Object} passwordData - Datos de contraseña (old_password, new_password, new_password_confirm)
   * @returns {Promise} - Promesa con la respuesta del servidor
   */
  changePassword: async (passwordData) => {
    try {
      const response = await apiClient.patch(ENDPOINTS.USER_PROFILE, passwordData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
