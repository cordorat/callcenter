import apiClient from "./apiClient";
/**
 * Crea un nuevo producto.
 * @param {Object} data - Datos del producto a crear.
 * @returns {Promise<Object>} 
 */
export const createSale = async (data) => {
  try {
    const response = await apiClient.post('/api/calls/ventas/registrar_venta/', data);
    return response.data;
  } catch (error) {
    console.error('Error creando la venta:', error);
    throw error;
  }
};