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
 * @returns {Promise<Array>} Lista de jefes de campaña normalizada
 */
export const searchJefesCampana = async (query) => {
  try {
    const response = await apiClient.get('/campaigns/buscar-jefes/', {
      params: { q: query },
    });

    const data = response.data;
    console.log('[campaigns.js] Respuesta buscar-jefes:', data);

    // Normalizamos a array plano:
    let lista = [];

    if (Array.isArray(data)) {
      lista = data;
    } else if (Array.isArray(data.results)) {
      lista = data.results;
    } else if (Array.isArray(data.data)) {
      lista = data.data;
    }

    // Mapeamos a estructura estándar { id, codigo, nombre }
    const normalizados = lista.map((item) => ({
      id: item.id ?? item.documento_id ?? item.pk,
      codigo: item.codigo ?? item.username ?? item.documento_id ?? '',
      nombre:
        item.nombre ??
        item.nombre_completo ??
        item.full_name ??
        `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim(),
    }));

    return normalizados;
  } catch (error) {
    console.error('[campaigns.js] Error al buscar jefes de campaña:', error);
    throw error;
  }
};

/**
 * Obtener productos activos disponibles
 * @returns {Promise<Array>} Lista de productos activos
 */
export const getProductosActivos = async () => {
  try {
    const response = await apiClient.get('/campaigns/productos/');
    const data = response.data;
    console.log('[campaigns.js] Respuesta productos activos:', data);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.productos)) return data.productos;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.data)) return data.data;

    return [];
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
    const response = await apiClient.get(
      '/campaigns/equipos/campanas-activas/'
    );
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
    const response = await apiClient.put(
      `/campaigns/base-datos/${baseId}/programar-iteracion/`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error(
      '[campaigns.js] Error al programar/iniciar iteración:',
      error
    );
    throw error;
  }
};

/**
 * Obtener detalles completos de una campaña
 * @param {number} campaignId - ID de la campaña
 * @returns {Promise<Object>} Datos completos de la campaña
 */
export const getCampaignDetail = async (campaignId) => {
  try {
    const response = await apiClient.get(`/campaigns/${campaignId}/`);
    return response.data;
  } catch (error) {
    console.error(
      `[campaigns.js] Error al obtener detalles de campaña ${campaignId}:`,
      error
    );
    throw error;
  }
};

/**
 * Actualizar una campaña (PATCH parcial)
 * @param {number} campaignId - ID de la campaña a actualizar
 * @param {Object} data - Datos a actualizar {nombre, descripcion, fecha_inicio, fecha_fin, estado, jefe_campana, objetivo_llamadas, objetivo_ventas, productos_ids}
 * @returns {Promise<Object>} { message, data }
 */
export const updateCampaign = async (campaignId, data) => {
  try {
    const response = await apiClient.patch(`/campaigns/${campaignId}/`, data);
    return response.data;
  } catch (error) {
    console.error(
      `[campaigns.js] Error al actualizar campaña ${campaignId}:`,
      error
    );
    throw error;
  }
};

/**
 * Validar datos de campaña (replicar validaciones del backend en frontend)
 * @param {Object} data - Datos a validar
 * @returns {Object|null} Objeto con errores o null si es válido
 */
export const validateCampaignData = (data) => {
  const errores = {};

  // Validar nombre
  if (!data.nombre || data.nombre.trim().length < 5) {
    errores.nombre = 'El nombre debe tener al menos 5 caracteres';
  }
  if (data.nombre && data.nombre.length > 50) {
    errores.nombre = 'El nombre no puede exceder 50 caracteres';
  }
  if (
    data.nombre &&
    !/^[a-zA-Z\sáéíóúñÁÉÍÓÚÑ]+$/.test(data.nombre)
  ) {
    errores.nombre = 'El nombre solo puede contener letras y espacios';
  }

  // Validar descripción
  if (data.descripcion && data.descripcion.length > 200) {
    errores.descripcion = 'La descripción no puede exceder 200 caracteres';
  }

  // Validar fechas
  if (data.fecha_inicio && data.fecha_fin) {
    if (new Date(data.fecha_fin) <= new Date(data.fecha_inicio)) {
      errores.fecha_fin =
        'La fecha de fin debe ser posterior a la fecha de inicio';
    }
  }

  // Validar productos
  if (!data.productos_ids || data.productos_ids.length === 0) {
    errores.productos_ids = 'Debe seleccionar al menos un producto';
  }

  // Validar objetivos
  if (data.objetivo_llamadas && data.objetivo_llamadas < 1) {
    errores.objetivo_llamadas =
      'El objetivo de llamadas debe ser mayor a 0';
  }
  if (data.objetivo_ventas && data.objetivo_ventas < 0) {
    errores.objetivo_ventas =
      'El objetivo de ventas debe ser mayor o igual a 0';
  }

  return Object.keys(errores).length > 0 ? errores : null;
};

/**
 * Procesar errores del backend y retornar información legible
 * @param {Error} error - Error capturado
 * @returns {Object} { tipo, mensaje, detalles }
 */
export const processCampaignError = (error) => {
  const defaultError = {
    tipo: 'desconocido',
    mensaje: 'Error desconocido',
    detalles: {},
  };

  if (!error.response) {
    return {
      tipo: 'red',
      mensaje: 'Error de conexión. Verifique su conexión a internet.',
      detalles: {},
    };
  }

  const { status, data } = error.response;

  if (status === 400) {
    return {
      tipo: 'validacion',
      mensaje: 'Error de validación',
      detalles: data?.error || data,
    };
  }

  if (status === 401) {
    return {
      tipo: 'autenticacion',
      mensaje: 'Su sesión ha expirado. Por favor inicie sesión nuevamente.',
      detalles: {},
    };
  }

  if (status === 403) {
    return {
      tipo: 'permiso',
      mensaje: 'No tiene permisos para editar campañas de otros centros',
      detalles: {},
    };
  }

  if (status === 404) {
    return {
      tipo: 'noEncontrado',
      mensaje: 'La campaña no existe',
      detalles: {},
    };
  }

  if (status >= 500) {
    return {
      tipo: 'servidor',
      mensaje: 'Error en el servidor. Intente más tarde.',
      detalles: {},
    };
  }

  return defaultError;
};
