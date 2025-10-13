//Path: src/components/agentStatus/AgentMinutes.jsx
//Este componente muestra el tiempo que lleva el agente en un estado determinado (Disponible, Ocupado, Desconectado)
import * as React from "react";
import { Box, Typography, CircularProgress } from '@mui/material';
import { useState, useEffect, useRef } from "react";
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useAgentState } from '@/hooks/useAgentState';

export default function AgentMinutes({ userId, currentStatus }) {
  const { currentState, timeInState: backendTimeInState, loading, frontendState } = useAgentState({ 
    autoLoad: true,
    refreshInterval: 30000 // Sincroniza con backend cada 30 segundos
  });
  
  const [displayTime, setDisplayTime] = useState(0);
  const intervalRef = useRef(null);
  const previousStateRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Efecto para inicializar el tiempo cuando carga por primera vez
  useEffect(() => {
    if (!isInitializedRef.current && backendTimeInState !== null && backendTimeInState !== undefined) {
      console.log('[AgentMinutes] Inicialización: tiempo del backend =', backendTimeInState);
      setDisplayTime(backendTimeInState);
      previousStateRef.current = currentState?.estado || frontendState;
      isInitializedRef.current = true;
    }
  }, [backendTimeInState, currentState?.estado, frontendState]);

  // Efecto principal: detectar cambio de estado y reiniciar contador
  useEffect(() => {
    const currentStateValue = currentState?.estado || frontendState;
    
    // Si el estado cambió
    if (currentStateValue && previousStateRef.current && currentStateValue !== previousStateRef.current) {
      console.log('[AgentMinutes] 🔄 Estado cambió:', previousStateRef.current, '->', currentStateValue);
      
      previousStateRef.current = currentStateValue;
      
      // Limpiar intervalo anterior si existe
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Resetear el tiempo a 0 (nuevo estado siempre empieza en 0)
      console.log('[AgentMinutes] ⏱️ Reiniciando tiempo a 0');
      setDisplayTime(0);
    }
  }, [currentState?.estado, frontendState]);

  // Efecto separado: mantener el contador corriendo
  useEffect(() => {
    // Limpiar intervalo anterior
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Iniciar nuevo contador
    intervalRef.current = setInterval(() => {
      setDisplayTime(prev => prev + 1);
    }, 1000);
    
    // Cleanup al desmontar o cuando cambia el estado
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentState?.estado, frontendState]); // Se reinicia cuando cambia el estado

  // Formatear el tiempo en MM:SS o HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderRadius: 2,
        paddingX: 1.5,
        paddingY: 1.5,
        minWidth: 100,
        minHeight: 40,
      }}
    >
      <CircularProgress size={20} />
    </Box>
  );

  return (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderRadius: 2,
            paddingX: 1.5,
            paddingY: 1.5,
            minWidth: 100,
            minHeight: 40,
        }}
    >
      <AccessTimeIcon sx={{ fontSize: 18, color: '#0C155A' }} />
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {formatTime(displayTime)}
      </Typography>
    </Box>
  );
}
