import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getCurrentState, changeState as apiChangeState, mapBackendToFrontend, mapFrontendToBackend } from '@/core/api/agentStates';

//Contexto centralizado para el estado del agente.

const AgentStateContext = createContext(null);

// Intervalo de polling unificado (10 segundos para balance entre responsividad y carga del servidor)
const POLLING_INTERVAL = 10000;

export function AgentStateProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  
  const [agentState, setAgentState] = useState({
    currentStatus: null,
    timeInState: 0,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const pollingRef = useRef(null);
  const isMountedRef = useRef(true);
  const isPollingEnabledRef = useRef(false);

  // Determinar si el usuario necesita polling de estado (solo agentes)
  const shouldPoll = isAuthenticated && user?.role === 'AGENTE';

  const fetchCurrentState = useCallback(async (showLoading = false) => {
    if (!isMountedRef.current) return;
    
    if (showLoading) {
      setAgentState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      const data = await getCurrentState();
      
      if (!isMountedRef.current) return;

      // getCurrentState devuelve directamente los datos, no un objeto con success
      const backendStatus = data.estado || data.estado_nombre;
      const mappedStatus = mapBackendToFrontend(backendStatus);
      
      setAgentState({
        currentStatus: mappedStatus,
        timeInState: data.tiempo_en_estado || 0,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
        // Datos adicionales del backend
        rawData: data,
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('[AgentStateContext] Error fetching state:', error);
      setAgentState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error de conexión',
      }));
    }
  }, []);

  const changeState = useCallback(async (newStatus, comment = null) => {
    if (!isMountedRef.current) return { success: false, error: 'Componente desmontado' };

    // Convertir estado frontend a backend
    const backendStatus = mapFrontendToBackend(newStatus);
    
    try {
      const response = await apiChangeState(backendStatus, comment || '');
      
      if (!isMountedRef.current) return { success: true, data: response };

      // Actualizar estado inmediatamente sin esperar al polling
      setAgentState(prev => ({
        ...prev,
        currentStatus: newStatus,
        timeInState: 0,
        lastUpdated: Date.now(),
        error: null,
      }));
      
      // Refrescar desde backend para sincronización
      setTimeout(() => {
        if (isMountedRef.current) {
          fetchCurrentState(false);
        }
      }, 500);

      return { success: true, data: response };
    } catch (error) {
      console.error('[AgentStateContext] Error changing state:', error);
      return { success: false, error: error.message };
    }
  }, [fetchCurrentState]);

  const refresh = useCallback(() => {
    return fetchCurrentState(true);
  }, [fetchCurrentState]);

  // Iniciar/detener polling según autenticación y rol
  useEffect(() => {
    isMountedRef.current = true;

    if (shouldPoll) {
      console.log('[AgentStateContext] Iniciando polling centralizado (intervalo:', POLLING_INTERVAL, 'ms)');
      isPollingEnabledRef.current = true;
      
      // Fetch inicial
      fetchCurrentState(true);

      // Configurar polling
      pollingRef.current = setInterval(() => {
        if (isMountedRef.current && isPollingEnabledRef.current) {
          fetchCurrentState(false);
        }
      }, POLLING_INTERVAL);
    } else {
      // Usuario no requiere polling, resetear estado
      isPollingEnabledRef.current = false;
      setAgentState({
        currentStatus: null,
        timeInState: 0,
        loading: false,
        error: null,
        lastUpdated: null,
      });
    }

    return () => {
      isMountedRef.current = false;
      isPollingEnabledRef.current = false;
      
      if (pollingRef.current) {
        console.log('[AgentStateContext] Deteniendo polling');
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [shouldPoll, fetchCurrentState]);

  const contextValue = {
    // Estado
    currentStatus: agentState.currentStatus,
    timeInState: agentState.timeInState,
    loading: agentState.loading,
    error: agentState.error,
    lastUpdated: agentState.lastUpdated,
    rawData: agentState.rawData,
    
    // Acciones
    changeState,
    refresh,
    
    // Utilidades
    isPolling: shouldPoll,
  };

  return (
    <AgentStateContext.Provider value={contextValue}>
      {children}
    </AgentStateContext.Provider>
  );
}

export function useAgentStateContext() {
  const context = useContext(AgentStateContext);
  
  if (!context) {
    throw new Error(
      'useAgentStateContext debe usarse dentro de un AgentStateProvider. ' +
      'Asegúrate de que el componente esté envuelto en <AgentStateProvider>.'
    );
  }
  
  return context;
}

export default AgentStateContext;
