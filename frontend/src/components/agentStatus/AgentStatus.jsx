//Path: src/components/agentStatus/agentStatus.jsx

import * as React from "react";
import { Select, MenuItem, FormControl, Box, CircularProgress } from '@mui/material';
import { useState, useEffect } from "react";
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// Estados disponibles para el agente con sus colores
const AGENT_STATUSES = [
  { value: 'AVAILABLE', label: 'Disponible', color: '#4CAF50' },
  { value: 'CALL', label: 'En llamada', color: '#198FFC' },
  { value: 'BUSY', label: 'No disponible', color: '#C30C0C' },
  { value: 'AFTERCALL', label: 'After Call', color: '#FCC419' },
  { value: 'BATHROOM', label: 'Baño', color: '#895208' },
  { value: 'LUNCH', label: 'Almuerzo', color: '#8B4513' },
  { value: 'BREAK', label: 'Break', color: '#753a11ff' },
  { value: 'OFFLINE', label: 'Desconectado', color: '#636363' },
];

// Función para obtener el color según el estado
const getStatusColor = (statusValue) => {
  return AGENT_STATUSES.find(s => s.value === statusValue)?.color || '#9e9e9e';
};

export default function AgentStatus({ userId, onStatusChange }) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Cargar estado inicial desde backend
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/agent/${userId}/status`);
        const data = await res.json();
        const initialStatus = data.status || AGENT_STATUSES[0].value;
        setStatus(initialStatus);
        // Notificar al padre del estado inicial
        if (onStatusChange) {
          onStatusChange(initialStatus);
        }
      } catch (err) {
        console.error('Error al obtener el estado del agente', err);
        const defaultStatus = AGENT_STATUSES[0].value;
        setStatus(defaultStatus);
        if (onStatusChange) {
          onStatusChange(defaultStatus);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [userId, onStatusChange]);

  const handleChange = async (event) => {
    const newStatus = event.target.value;
    setStatus(newStatus);

    // Notificar al padre que el estado cambió
    if (onStatusChange) {
      onStatusChange(newStatus);
    }

    // Enviar al backend
    try {
      await fetch(`/api/agent/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Error al actualizar el estado del agente', err);
    }
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <FormControl
      variant="standard"
      size="small"
      sx={{ minWidth: 150, minHeight: 40, marginRight: 2, backgroundColor: '#D3E8FB', borderRadius: 2, paddingX: 1, justifyContent: 'center' }}
    >
      <Select 
        value={status} 
        onChange={handleChange} 
        disableUnderline
        renderValue={(selected) => {
          const selectedStatus = AGENT_STATUSES.find(s => s.value === selected);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FiberManualRecordIcon 
                sx={{ fontSize: 12, color: selectedStatus?.color }} 
              />
              {selectedStatus?.label}
            </Box>
          );
        }}
      >
        {AGENT_STATUSES.map((s) => (
          <MenuItem key={s.value} value={s.value}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FiberManualRecordIcon 
                sx={{ fontSize: 12, color: s.color }} 
              />
              {s.label}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
