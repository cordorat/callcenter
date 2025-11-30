// PATH: src/hooks/useAgentState.js

import { useState, useCallback, useEffect, useContext } from 'react';
import AgentStateContext from '../core/context/AgentStateContext';
import {
    changeState as apiChangeState,
    mapFrontendToBackend,
    requiresComments
} from '../core/api/agentStates';
import { subscribeToAgentStateChanges } from './useTwilioCall';

//Hook personalizado para gestionar el estado del agente. 
export const useAgentState = ({ autoLoad = true, refreshInterval = 0 } = {}) => {
    // Obtener estado del contexto centralizado
    const context = useContext(AgentStateContext);
    
    // Estado local para flags de operaciones en progreso
    const [changing, setChanging] = useState(false);
    const [localError, setLocalError] = useState(null);

    const hasContext = context !== null;
    
    // Extraer valores del contexto o usar defaults
    const currentStatus = hasContext ? context.currentStatus : null;
    const timeInState = hasContext ? context.timeInState : 0;
    const loading = hasContext ? context.loading : false;
    const contextError = hasContext ? context.error : null;
    const rawData = hasContext ? context.rawData : null;
    const contextRefresh = hasContext ? context.refresh : null;

    /**
     * Cambia el estado del agente.
     * 
     * @param {string} newFrontendState - Nuevo estado en formato frontend
     * @param {string} comentarios - Comentarios opcionales
     * @returns {Promise<Object>} Nuevo estado
     */
    const changeAgentState = useCallback(async (newFrontendState, comentarios = '') => {
        if (!hasContext) {
            throw new Error('useAgentState: No hay contexto disponible');
        }

        try {
            setChanging(true);
            setLocalError(null);

            // Convertir al formato del backend
            const newBackendState = mapFrontendToBackend(newFrontendState);

            // Verificar si requiere comentarios
            if (requiresComments(newBackendState) && !comentarios) {
                throw new Error(`El estado ${newBackendState} requiere comentarios`);
            }

            // Actualizar estado en el backend
            const userAgent = navigator.userAgent;
            const response = await apiChangeState(newBackendState, comentarios, null, userAgent);

            // Refrescar el contexto para sincronizar
            if (contextRefresh) {
                setTimeout(() => contextRefresh(), 500);
            }

            return response;
        } catch (err) {
            console.error('[useAgentState] ❌ Error al cambiar estado:', err);
            setLocalError(err.message || 'Error al cambiar el estado');
            throw err;
        } finally {
            setChanging(false);
        }
    }, [hasContext, contextRefresh]);

    /**
     * Refresca el estado actual
     */
    const refresh = useCallback(() => {
        if (contextRefresh) {
            return contextRefresh();
        }
        return Promise.resolve();
    }, [contextRefresh]);

    const loadCurrentState = useCallback((silent = false) => {
        return refresh();
    }, [refresh]);

    // Escuchar cambios de estado desde useTwilioCall 
    useEffect(() => {
        const unsubscribe = subscribeToAgentStateChanges((newStateData) => {
            if (newStateData && contextRefresh) {
                // Cuando hay un cambio desde Twilio, refrescar el contexto
                contextRefresh();
            }
        });

        return unsubscribe;
    }, [contextRefresh]);

    // Construir objeto currentState compatible con el formato anterior
    const currentState = rawData ? {
        ...rawData,
        estado: currentStatus,
        tiempo_en_estado: timeInState,
    } : null;

    return {
        // Estado
        currentState,                    // Estado completo del backend
        frontendState: currentStatus || 'OFFLINE',  // Estado en formato frontend
        loading,                         // Cargando estado inicial
        error: localError || contextError,  // Error si lo hay
        changing,                        // Cambiando estado
        syncing: false,                  // Ya no hay sync separado, el contexto maneja todo

        // Datos derivados
        isAvailable: rawData?.acepta_llamadas || false,
        isConnected: rawData?.conexion_activa || false,
        hasAudio: rawData?.tiene_audio || false,
        canReceiveCalls: rawData?.puede_recibir_llamadas || false,
        timeInState: timeInState,
        stateDisplay: rawData?.estado_display || 'Desconocido',

        // Funciones
        changeState: changeAgentState,
        refresh,
        loadCurrentState,
    };
};

export default useAgentState;
