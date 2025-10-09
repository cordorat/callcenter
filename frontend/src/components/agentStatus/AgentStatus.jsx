//Path: src/components/agentStatus/agentStatus.jsx

import * as React from "react";
import { Select, MenuItem, FormControl, Box, CircularProgress } from '@mui/material';
import { useState, useEffect } from "react";
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// Estados disponibles para el agente con sus colores
const AGENT_STATUSES = [
  { value: 'AVAILABLE', label: 'Disponible', color: '#4caf50' },
  { value: 'BUSY', label: 'Ocupado', color: '#ff9800' },
  { value: 'OFFLINE', label: 'Desconectado', color: '#9e9e9e' },
];

// Función para obtener el color según el estado
const getStatusColor = (statusValue) => {
  return AGENT_STATUSES.find(s => s.value === statusValue)?.color || '#9e9e9e';
};

export default function AgentStatus({ userId }) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Cargar estado inicial desde backend
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/agent/${userId}/status`);
        const data = await res.json();
        setStatus(data.status || AGENT_STATUSES[0].value);
      } catch (err) {
        console.error('Error al obtener el estado del agente', err);
        setStatus(AGENT_STATUSES[0].value);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [userId]);

  const handleChange = async (event) => {
    const newStatus = event.target.value;
    setStatus(newStatus);

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
