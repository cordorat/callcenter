// PATH: src/hooks/useAgentState.js

import { useState, useEffect, useCallback } from 'react';
import {
    getCurrentState,
    changeState,
    mapBackendToFrontend,
    mapFrontendToBackend,
    requiresComments
} from '../core/api/agentStates';
import { subscribeToAgentStateChanges } from './useTwilioCall';

/**
 * Hook personalizado para gestionar el estado del agente
 * @param {Object} options - Opciones del hook
 * @param {boolean} options.autoLoad - Cargar automáticamente el estado inicial
 * @param {number} options.refreshInterval - Intervalo de refresco en ms (0 = sin auto-refresh)
 * @returns {Object} Estado y funciones del hook
 */
export const useAgentState = ({ autoLoad = true, refreshInterval = 0 } = {}) => {
    const [currentState, setCurrentState] = useState(null);
    const [frontendState, setFrontendState] = useState('OFFLINE');
    const [loading, setLoading] = useState(autoLoad);
    const [error, setError] = useState(null);
    const [changing, setChanging] = useState(false);
    const [syncing, setSyncing] = useState(false);

    /**
     * Carga el estado actual desde el backend
     */
    const loadCurrentState = useCallback(async (silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            } else {
                setSyncing(true);
            }
            setError(null);

            const data = await getCurrentState();
            setCurrentState(data);

            const mappedState = mapBackendToFrontend(data.estado);
            setFrontendState(mappedState);

            return data;
        } catch (err) {
            console.error('[useAgentState] ❌ Error al cargar estado:', err);
            setError(err.message || 'Error al cargar el estado');
            setFrontendState('OFFLINE');
            throw err;
        } finally {
            if (!silent) {
                setLoading(false);
            } else {
                setSyncing(false);
            }
        }
    }, []);

    /**
     * Cambia el estado del agente
     * @param {string} newFrontendState - Nuevo estado en formato frontend
     * @param {string} comentarios - Comentarios opcionales
     * @returns {Promise<Object>} Nuevo estado
     */
    const changeAgentState = useCallback(async (newFrontendState, comentarios = '') => {
        try {
            setChanging(true);
            setError(null);

            // Convertir al formato del backend
            const newBackendState = mapFrontendToBackend(newFrontendState);

            // Verificar si requiere comentarios
            if (requiresComments(newBackendState) && !comentarios) {
                throw new Error(`El estado ${newBackendState} requiere comentarios`);
            }

            // Actualizar estado en el backend
            const userAgent = navigator.userAgent;
            const response = await changeState(newBackendState, comentarios, null, userAgent);

            // Actualizar estado local INMEDIATAMENTE con la respuesta
            setCurrentState(response);
            const mappedState = mapBackendToFrontend(response.estado);
            setFrontendState(mappedState);

            return response;
        } catch (err) {
            console.error('[useAgentState] ❌ Error al cambiar estado:', err);
            setError(err.message || 'Error al cambiar el estado');
            throw err;
        } finally {
            setChanging(false);
        }
    }, []);

    /**
     * Refresca el estado actual
     */
    const refresh = useCallback(() => {
        return loadCurrentState();
    }, [loadCurrentState]);

    // Cargar estado inicial
    useEffect(() => {
        if (autoLoad) {
            loadCurrentState();
        }
    }, [autoLoad, loadCurrentState]);

    // Auto-refresh si está configurado
    useEffect(() => {
        if (refreshInterval > 0) {
            const interval = setInterval(() => {
                loadCurrentState();
            }, refreshInterval);

            return () => clearInterval(interval);
        }
    }, [refreshInterval, loadCurrentState]);

    // Escuchar cambios de estado desde useTwilioCall
    useEffect(() => {
        const unsubscribe = subscribeToAgentStateChanges((newStateData) => {
            if (newStateData) {
                // Si recibimos datos del estado directamente, usarlos sin hacer llamada al servidor
                setCurrentState(newStateData);
                const mappedState = mapBackendToFrontend(newStateData.estado);
                setFrontendState(mappedState);
            } else {
                // Si no hay datos, cargar desde el servidor
                loadCurrentState(true);
            }
        });

        return unsubscribe;
    }, [loadCurrentState]);

    return {
        // Estado
        currentState,        // Estado completo del backend
        frontendState,       // Estado en formato frontend (AVAILABLE, CALL, etc.)
        loading,             // Cargando estado inicial
        error,               // Error si lo hay
        changing,            // Cambiando estado
        syncing,             // Sincronizando en background

        // Datos derivados
        isAvailable: currentState?.acepta_llamadas || false,
        isConnected: currentState?.conexion_activa || false,
        hasAudio: currentState?.tiene_audio || false,
        canReceiveCalls: currentState?.puede_recibir_llamadas || false,
        timeInState: currentState?.tiempo_en_estado || 0,
        stateDisplay: currentState?.estado_display || 'Desconocido',

        // Funciones
        changeState: changeAgentState,
        refresh,
        loadCurrentState,
    };
};

export default useAgentState;
