import apiClient from "./apiClient";

/**
 * API Client para gestión de productos.
 */

/**
 * Obtiene la lista de productos.
 * @param {Object} params - Parámetros opcionales para filtrar o paginar.
 * @returns {Promise<Object>} { success, count, results }
 */
export const getProducts = async (params = {}) => {
  try {
    const response = await apiClient.get('/campaigns/productos/', { params });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo los productos:', error);
    throw error;
  }
};


/**
 * Crea un nuevo producto.
 * @param {Object} data - Datos del producto a crear.
 * @returns {Promise<Object>} 
 */
export const createProduct = async (data) => {
  try {
    const response = await apiClient.post('/campaigns/productos/', data);
    return response.data;
  } catch (error) {
    console.error('Error creando el producto:', error);
    throw error;
  }
};