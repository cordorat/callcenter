//Path: src/components/agentStatus/AgentMinutes.jsx
//Este componente muestra el tiempo que lleva el agente en un estado determinado (Disponible, Ocupado, Desconectado)
import * as React from "react";
import { Box, Typography, CircularProgress } from '@mui/material';
import { useState, useEffect } from "react";
import AccessTimeIcon from '@mui/icons-material/AccessTime';

export default function AgentMinutes({ userId, currentStatus }) {
  const [timeInState, setTimeInState] = useState(0); // Tiempo en segundos
  const [loading, setLoading] = useState(true);

  // Cargar tiempo inicial desde backend cuando cambia el estado
  useEffect(() => {
    async function fetchTime() {
      setLoading(true);
      try {
        const res = await fetch(`/api/agent/${userId}/time-in-state`);
        const data = await res.json();
        setTimeInState(data.seconds || 0);
      } catch (err) {
        console.error('Error al obtener el tiempo del agente', err);
        setTimeInState(0);
      } finally {
        setLoading(false);
      }
    }
    fetchTime();
  }, [userId, currentStatus]); // Se reinicia cuando cambia el estado

  // Actualizar el contador cada segundo (opcional: solo si quieres contador en tiempo real)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInState(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  if (loading) return <CircularProgress size={20} />;

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
        {formatTime(timeInState)}
      </Typography>
    </Box>
  );
}
