//Path: src/components/agentStatus/AgentMinutes.jsx
//Este componente muestra el tiempo que lleva el agente en un estado determinado (Disponible, Ocupado, Desconectado)
import * as React from "react";
import { Box, Typography, CircularProgress } from '@mui/material';
import { useState, useEffect, useRef } from "react";
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useAgentState } from '@/hooks/useAgentState';

export default function AgentMinutes({ userId, currentStatus }) {
  const { currentState, timeInState: backendTimeInState, loading, refresh } = useAgentState({ 
    autoLoad: true,
    refreshInterval: 20000 // Sincroniza con backend cada 30 segundos
  });
  
  const [displayTime, setDisplayTime] = useState(0);
  const intervalRef = useRef(null);
  const lastSyncRef = useRef(Date.now());
  const previousStatusRef = useRef(currentStatus);

  // Detectar cambio de estado desde el prop y actualizar inmediatamente
  useEffect(() => {
    if (currentStatus && currentStatus !== previousStatusRef.current) {
      console.log('Estado cambió de', previousStatusRef.current, 'a', currentStatus);
      previousStatusRef.current = currentStatus;
      
      // Actualizar inmediatamente desde el backend
      refresh();
    }
  }, [currentStatus, refresh]);

  // Sincronizar con el tiempo del backend cuando cambia
  useEffect(() => {
    if (backendTimeInState !== null && backendTimeInState !== undefined) {
      setDisplayTime(backendTimeInState);
      lastSyncRef.current = Date.now();
    }
  }, [backendTimeInState, currentState?.estado]);

  // Actualizar el contador cada segundo localmente
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDisplayTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentState?.estado]); // Reinicia el intervalo cuando cambia el estado

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
