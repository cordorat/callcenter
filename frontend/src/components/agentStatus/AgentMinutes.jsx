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
  
  // Inicializar el estado desde sessionStorage ANTES de cualquier otro efecto
  const [displayTime, setDisplayTime] = useState(() => {
    const savedStartTime = sessionStorage.getItem('agentMinutes_startTime');
    const savedStatus = sessionStorage.getItem('agentMinutes_status');
    
    if (savedStartTime && savedStatus) {
      const startTime = parseInt(savedStartTime, 10);
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      console.log('[AgentMinutes] 📦 Inicializando desde sessionStorage:', elapsedSeconds, 'segundos para estado:', savedStatus);
      return elapsedSeconds >= 0 ? elapsedSeconds : 0;
    }
    return 0;
  });
  
  const intervalRef = useRef(null);
  const previousStatusRef = useRef(sessionStorage.getItem('agentMinutes_status'));
  const lastSyncTimeRef = useRef(null); // Referencia del último tiempo sincronizado
  const startTimeRef = useRef(
    (() => {
      const savedStartTime = sessionStorage.getItem('agentMinutes_startTime');
      return savedStartTime ? parseInt(savedStartTime, 10) : Date.now();
    })()
  ); // Ejecutar IIFE inmediatamente para inicializar
  const lastTickRef = useRef(Date.now()); // Última actualización del contador
  const isInitializedRef = useRef(false); // Para evitar reinicios innecesarios

  // Efecto de inicialización: usar frontendState del hook como fuente de verdad
  useEffect(() => {
    if (frontendState && !isInitializedRef.current) {
      const savedStatus = sessionStorage.getItem('agentMinutes_status');
      
      console.log('[AgentMinutes] 🔄 Inicializando - Estado del hook:', frontendState, 'Estado guardado:', savedStatus);
      
      if (savedStatus === frontendState) {
        console.log('[AgentMinutes] ✅ Estado recuperado coincide con backend, manteniendo tiempo');
        previousStatusRef.current = frontendState;
        isInitializedRef.current = true;
      } else {
        console.log('[AgentMinutes] ⚠️ Estado diferente o primera vez - Backend:', frontendState, 'vs Storage:', savedStatus);
        
        // Si hay tiempo en el backend, usarlo para sincronizar
        if (backendTimeInState !== null && backendTimeInState !== undefined) {
          console.log('[AgentMinutes] 🔄 Sincronizando con tiempo del backend:', backendTimeInState);
          const now = Date.now();
          setDisplayTime(backendTimeInState);
          startTimeRef.current = now - (backendTimeInState * 1000);
          lastSyncTimeRef.current = backendTimeInState;
        } else {
          // No hay tiempo en backend, resetear
          const now = Date.now();
          setDisplayTime(0);
          startTimeRef.current = now;
          lastSyncTimeRef.current = 0;
        }
        
        previousStatusRef.current = frontendState;
        sessionStorage.setItem('agentMinutes_startTime', startTimeRef.current.toString());
        sessionStorage.setItem('agentMinutes_status', frontendState);
        isInitializedRef.current = true;
      }
    }
  }, [frontendState, backendTimeInState]);

  // Efecto SECUNDARIO: detectar cambio INMEDIATO desde el prop currentStatus
  // Este efecto se dispara cuando el padre (AgentStatus) cambia de estado
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (!currentStatus) return;
    
    // Si el prop cambió y es diferente al estado previo, resetear inmediatamente
    if (currentStatus !== previousStatusRef.current) {
      console.log('[AgentMinutes] 🔄 Cambio INMEDIATO detectado desde prop:', previousStatusRef.current, '->', currentStatus);
      
      previousStatusRef.current = currentStatus;
      
      // Resetear el tiempo a 0 inmediatamente
      console.log('[AgentMinutes] ⏱️ Reiniciando tiempo a 0 por cambio inmediato de estado');
      const now = Date.now();
      setDisplayTime(0);
      startTimeRef.current = now;
      lastTickRef.current = now;
      lastSyncTimeRef.current = 0;
      
      // Guardar en sessionStorage
      sessionStorage.setItem('agentMinutes_startTime', now.toString());
      sessionStorage.setItem('agentMinutes_status', currentStatus);
    }
  }, [currentStatus]);

  // Efecto de sincronización: ajustar el tiempo si el backend reporta un valor diferente
  // (por ejemplo, si estuvimos desconectados y volvemos)
  useEffect(() => {
    if (!isInitializedRef.current) return;
    
    // Si el backend reporta un tiempo Y es diferente al último que sincronizamos
    // Actualizar nuestro tiempo local para estar en sincronía
    if (backendTimeInState !== null && 
        backendTimeInState !== undefined &&
        backendTimeInState !== lastSyncTimeRef.current &&
        frontendState === previousStatusRef.current) { // Mismo estado, solo ajustar tiempo
      
      console.log('[AgentMinutes] 🔄 Ajustando tiempo con backend:', backendTimeInState, 'vs local:', displayTime);
      
      lastSyncTimeRef.current = backendTimeInState;
      const now = Date.now();
      
      // Calcular la diferencia para ver si vale la pena ajustar
      const timeDiff = Math.abs(backendTimeInState - displayTime);
      
      if (timeDiff > 2) { // Solo ajustar si la diferencia es mayor a 2 segundos
        console.log('[AgentMinutes] ⚠️ Diferencia significativa detectada:', timeDiff, 'segundos - Sincronizando');
        setDisplayTime(backendTimeInState);
        startTimeRef.current = now - (backendTimeInState * 1000);
        
        // Guardar en sessionStorage
        sessionStorage.setItem('agentMinutes_startTime', startTimeRef.current.toString());
      }
    }
  }, [backendTimeInState, frontendState, displayTime]);

  // Efecto separado: mantener el contador corriendo con requestAnimationFrame para mayor precisión
  useEffect(() => {
    let animationFrameId = null;
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      
      // Solo actualizar si cambió el segundo
      if (elapsedSeconds !== displayTime) {
        setDisplayTime(elapsedSeconds);
        lastTickRef.current = now;
      }
      
      animationFrameId = requestAnimationFrame(updateTimer);
    };
    
    animationFrameId = requestAnimationFrame(updateTimer);
    
    // Cleanup al desmontar
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [displayTime]); // Depende de displayTime para actualizar correctamente

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
