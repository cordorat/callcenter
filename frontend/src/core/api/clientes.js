// PATH: src/core/api/clientes.js

import apiClient from './apiClient';

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/**
 * Obtiene un cliente aleatorio de la base de datos
 * @param {Object} params - Parámetros opcionales
 * @param {number} params.campana_id - ID de campaña para filtrar
 * @param {number} params.base_datos_id - ID de base de datos para filtrar
 * @returns {Promise<Object>} - Datos del cliente aleatorio
 */
export const getRandomCliente = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${BASE_URL}/campaigns/clientes/random/${queryParams ? `?${queryParams}` : ''}`;
    
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('[clientes.js] Error obteniendo cliente aleatorio:', error);
    throw error;
  }
};

/**
 * Obtiene un cliente específico por ID
 * @param {number} clienteId - ID del cliente
 * @returns {Promise<Object>} - Datos del cliente
 */
export const getCliente = async (clienteId) => {
  try {
    const response = await apiClient.get(`${BASE_URL}/campaigns/clientes/${clienteId}/`);
    return response.data;
  } catch (error) {
    console.error('[clientes.js] Error obteniendo cliente:', error);
    throw error;
  }
};

/**
 * Actualiza la información de un cliente (actualización parcial)
 * @param {number} clienteId - ID del cliente
 * @param {Object} data - Datos a actualizar
 * @param {string} data.nombre - Nombre del cliente
 * @param {string} data.telefono - Teléfono del cliente
 * @param {string} data.email - Email del cliente (opcional)
 * @param {string} data.direccion - Dirección del cliente (opcional)
 * @param {string} data.observaciones - Observaciones (opcional)
 * @returns {Promise<Object>} - Respuesta del servidor
 */
export const updateCliente = async (clienteId, data) => {
  try {
    const response = await apiClient.patch(
      `${BASE_URL}/campaigns/clientes/${clienteId}/`,
      data
    );
    return response.data;
  } catch (error) {
    console.error('[clientes.js] Error actualizando cliente:', error);
    throw error;
  }
};

/**
 * Actualiza la información completa de un cliente
 * @param {number} clienteId - ID del cliente
 * @param {Object} data - Datos completos del cliente
 * @returns {Promise<Object>} - Respuesta del servidor
 */
export const updateClienteFull = async (clienteId, data) => {
  try {
    const response = await apiClient.put(
      `${BASE_URL}/campaigns/clientes/${clienteId}/`,
      data
    );
    return response.data;
  } catch (error) {
    console.error('[clientes.js] Error actualizando cliente completo:', error);
    throw error;
  }
};

/**
 * Valida un campo del cliente en tiempo real
 * @param {string} fieldName - Nombre del campo
 * @param {string} value - Valor a validar
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export const validateClienteField = (fieldName, value) => {
  switch (fieldName) {
    case 'nombre':
      if (!value || value.trim().length < 3) {
        return 'El nombre debe tener al menos 3 caracteres';
      }
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-']+$/.test(value)) {
        return 'El nombre solo puede contener letras, espacios, guiones y apóstrofes';
      }
      break;

    case 'telefono':
      if (!value || value.trim().length < 7) {
        return 'El teléfono debe tener al menos 7 dígitos';
      }
      if (!/^[\d\+\-\s\(\)]+$/.test(value)) {
        return 'El teléfono solo puede contener dígitos y símbolos: +, -, espacio, ( )';
      }
      break;

    case 'email':
      if (value && value.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'El formato del correo electrónico no es válido (ejemplo: nombre@dominio.com)';
        }
      }
      break;

    case 'documento_id':
      // Campo de solo lectura, no validar
      return null;

    default:
      return null;
  }
  return null;
};

/**
 * Valida todos los campos obligatorios del cliente
 * @param {Object} data - Datos del cliente
 * @returns {Object} - Objeto con errores por campo
 */
export const validateClienteData = (data) => {
  const errors = {};

  // Validar nombre (obligatorio)
  const nombreError = validateClienteField('nombre', data.nombre);
  if (nombreError) errors.nombre = nombreError;

  // Validar teléfono (obligatorio)
  const telefonoError = validateClienteField('telefono', data.telefono);
  if (telefonoError) errors.telefono = telefonoError;

  // Validar email (opcional, pero si existe debe ser válido)
  const emailError = validateClienteField('email', data.email);
  if (emailError) errors.email = emailError;

  return errors;
};
