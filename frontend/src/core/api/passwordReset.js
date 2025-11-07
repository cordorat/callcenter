// Path: frontend/src/core/api/passwordReset.js

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * API para recuperación de contraseña
 * No usa apiClient porque son endpoints públicos (sin autenticación)
 */

/**
 * Solicitar recuperación de contraseña
 * @param {string} email - Email del usuario
 * @returns {Promise<Object>} Respuesta con mensaje de confirmación
 */
export const requestPasswordReset = async (email) => {
  const response = await axios.post(`${BASE_URL}/auth/password-reset/request/`, {
    email,
  });
  return response.data;
};

/**
 * Validar token de recuperación
 * @param {string} token - Token recibido por email
 * @returns {Promise<Object>} { valid: boolean, email?: string, error?: string }
 */
export const validateResetToken = async (token) => {
  const response = await axios.get(`${BASE_URL}/auth/password-reset/validate-token/`, {
    params: { token },
  });
  return response.data;
};

/**
 * Confirmar nueva contraseña con token
 * @param {string} token - Token de recuperación
 * @param {string} newPassword - Nueva contraseña
 * @param {string} confirmPassword - Confirmación de contraseña
 * @returns {Promise<Object>} Respuesta con mensaje de éxito
 */
export const confirmPasswordReset = async (token, newPassword, confirmPassword) => {
  const response = await axios.post(`${BASE_URL}/auth/password-reset/confirm/`, {
    token,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  return response.data;
};
