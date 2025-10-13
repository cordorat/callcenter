// PATH: src/core/api/agentStates.js

import apiClient from './apiClient';

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/**
 * Mapeo de estados del backend a estados del frontend
 */
export const STATE_MAPPING = {
    // Backend -> Frontend
    DISPONIBLE: 'AVAILABLE',
    EN_LLAMADA: 'CALL',
    AFTERCALL: 'AFTERCALL',
    BREAK: 'BREAK',
    ALMUERZO: 'LUNCH',
    CAPACITACION: 'BUSY',
    BAÑO: 'BATHROOM',
    NO_DISPONIBLE: 'BUSY',
    DESCONECTADO: 'OFFLINE',
};

/**
 * Mapeo inverso: Frontend -> Backend
 */
export const STATE_MAPPING_REVERSE = {
    AVAILABLE: 'DISPONIBLE',
    CALL: 'EN_LLAMADA',
    AFTERCALL: 'AFTERCALL',
    BREAK: 'BREAK',
    LUNCH: 'ALMUERZO',
    BATHROOM: 'BAÑO',
    BUSY: 'NO_DISPONIBLE',
    OFFLINE: 'DESCONECTADO',
};

/**
 * Estados disponibles para el agente con sus colores
 * Nota: EN_LLAMADA se cambia automáticamente cuando se conecta una llamada con Twilio
 */
export const AGENT_STATUSES = [
    { value: 'AVAILABLE', label: 'Disponible', color: '#4CAF50', backendValue: 'DISPONIBLE' },
    { value: 'CALL', label: 'En llamada', color: '#198FFC', backendValue: 'EN_LLAMADA' },
    { value: 'AFTERCALL', label: 'After Call', color: '#FCC419', backendValue: 'AFTERCALL' },
    { value: 'BREAK', label: 'Break', color: '#753a11ff', backendValue: 'BREAK' }, 
    { value: 'BATHROOM', label: 'Baño', color: '#895208', backendValue: 'BAÑO' },
    { value: 'LUNCH', label: 'Almuerzo', color: '#8B4513', backendValue: 'ALMUERZO' },
    { value: 'BUSY', label: 'No disponible', color: '#C30C0C', backendValue: 'NO_DISPONIBLE' },
    { value: 'OFFLINE', label: 'Desconectado', color: '#636363', backendValue: 'DESCONECTADO' },
];

/**
 * Estados que requieren comentarios obligatorios
 */
export const STATES_REQUIRING_COMMENTS = ['CAPACITACION', 'REUNION', 'AUSENTE'];

/**
 * Obtiene el estado actual del agente autenticado
 * @returns {Promise<Object>} Estado actual del agente
 */
export const getCurrentState = async () => {
    try {
        console.log('[agentStates] Obteniendo estado actual...');
        const startTime = performance.now();
        
        const response = await apiClient.get(`${BASE_URL}/users/estados/current/`);
        
        const endTime = performance.now();
        console.log(`[agentStates] Estado actual recibido en ${(endTime - startTime).toFixed(0)}ms:`, response.data);
        
        return response.data;
    } catch (error) {
        console.error('[agentStates] Error al obtener estado actual:', error);
        throw error;
    }
};

/**
 * Obtiene el estado actual de un agente específico (solo admin)
 * @param {number} agenteId - ID del agente
 * @returns {Promise<Object>} Estado actual del agente
 */
export const getAgentState = async (agenteId) => {
    try {
        const response = await apiClient.get(`${BASE_URL}/users/estados/current/`, {
            params: { agente_id: agenteId }
        });
        return response.data;
    } catch (error) {
        console.error('Error al obtener estado del agente:', error);
        throw error;
    }
};

/**
 * Cambia el estado del agente autenticado
 * @param {string} nuevoEstado - Nuevo estado (valor del backend)
 * @param {string} comentarios - Comentarios opcionales
 * @param {string} ipAddress - IP del agente (opcional)
 * @param {string} userAgent - User agent del navegador (opcional)
 * @returns {Promise<Object>} Nuevo estado del agente
 */
export const changeState = async (nuevoEstado, comentarios = '', ipAddress = null, userAgent = null) => {
    try {
        const payload = {
            nuevo_estado: nuevoEstado,
            comentarios: comentarios || '',
        };

        if (ipAddress) payload.ip_address = ipAddress;
        if (userAgent) payload.user_agent = userAgent;

        console.log('[agentStates] Enviando cambio de estado:', payload);
        const startTime = performance.now();
        
        const response = await apiClient.post(`${BASE_URL}/users/estados/change_state/`, payload);
        
        const endTime = performance.now();
        console.log(`[agentStates] Respuesta recibida en ${(endTime - startTime).toFixed(0)}ms:`, response.data);
        
        return response.data;
    } catch (error) {
        console.error('[agentStates] Error al cambiar estado:', error);
        throw error;
    }
};

/**
 * Cambia el estado de un agente específico (solo admin)
 * @param {number} agenteId - ID del agente
 * @param {string} nuevoEstado - Nuevo estado
 * @param {string} comentarios - Comentarios opcionales
 * @returns {Promise<Object>} Nuevo estado del agente
 */
export const changeAgentState = async (agenteId, nuevoEstado, comentarios = '') => {
    try {
        const payload = {
            agente_id: agenteId,
            nuevo_estado: nuevoEstado,
            comentarios: comentarios || '',
        };

        const response = await apiClient.post(`${BASE_URL}/users/estados/change_state/`, payload);
        return response.data;
    } catch (error) {
        console.error('Error al cambiar estado del agente:', error);
        throw error;
    }
};

/**
 * Obtiene el historial de estados del agente
 * @param {Object} filters - Filtros opcionales
 * @param {string} filters.fecha_inicio - Fecha inicio (YYYY-MM-DD)
 * @param {string} filters.fecha_fin - Fecha fin (YYYY-MM-DD)
 * @param {string} filters.estado - Filtrar por estado
 * @param {number} filters.agente_id - ID del agente (solo admin)
 * @returns {Promise<Object>} Historial paginado
 */
export const getStateHistory = async (filters = {}) => {
    try {
        const response = await apiClient.get(`${BASE_URL}/users/estados/historial/`, {
            params: filters
        });
        return response.data;
    } catch (error) {
        console.error('Error al obtener historial:', error);
        throw error;
    }
};

/**
 * Obtiene la lista de agentes disponibles (solo admin)
 * @returns {Promise<Array>} Lista de agentes disponibles
 */
export const getAvailableAgents = async () => {
    try {
        const response = await apiClient.get(`${BASE_URL}/users/estados/disponibles/`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener agentes disponibles:', error);
        throw error;
    }
};

/**
 * Obtiene los estados actuales de todos los agentes (solo admin)
 * @returns {Promise<Array>} Lista de estados de todos los agentes
 */
export const getAllAgentStates = async () => {
    try {
        const response = await apiClient.get(`${BASE_URL}/users/estados/todos/`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener estados de agentes:', error);
        throw error;
    }
};

/**
 * Convierte un estado del backend al formato del frontend
 * @param {string} backendState - Estado en formato backend
 * @returns {string} Estado en formato frontend
 */
export const mapBackendToFrontend = (backendState) => {
    return STATE_MAPPING[backendState] || 'OFFLINE';
};

/**
 * Convierte un estado del frontend al formato del backend
 * @param {string} frontendState - Estado en formato frontend
 * @returns {string} Estado en formato backend
 */
export const mapFrontendToBackend = (frontendState) => {
    return STATE_MAPPING_REVERSE[frontendState] || 'DESCONECTADO';
};

/**
 * Obtiene el objeto de estado completo por su valor
 * @param {string} value - Valor del estado (frontend)
 * @returns {Object|null} Objeto de estado con color, label, etc.
 */
export const getStatusByValue = (value) => {
    return AGENT_STATUSES.find(s => s.value === value) || null;
};

/**
 * Obtiene el color de un estado
 * @param {string} value - Valor del estado (frontend)
 * @returns {string} Color en formato hex
 */
export const getStatusColor = (value) => {
    return getStatusByValue(value)?.color || '#9e9e9e';
};

/**
 * Verifica si un estado requiere comentarios
 * @param {string} backendState - Estado en formato backend
 * @returns {boolean} True si requiere comentarios
 */
export const requiresComments = (backendState) => {
    return STATES_REQUIRING_COMMENTS.includes(backendState);
};
