// Path: frontend/src/components/AgentStateSelect.jsx
/**
 * Componente para cambiar el estado de un agente desde la vista de coordinador.
 * Muestra un Select con los estados disponibles y permite cambiar el estado con confirmación.
 */

import React, { useState } from 'react';
import {
  Select,
  MenuItem,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import { changeAgentState, AGENT_STATUSES } from '@/core/api/agentStates';

export default function AgentStateSelect({ 
  agentId, 
  currentState, 
  onStateChanged, 
  disabled = false 
}) {
  const [selectedState, setSelectedState] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comentarios, setComentarios] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mapeo de estados del backend a frontend para mostrar
  const estadoMapping = {
    'DISPONIBLE': 'AVAILABLE',
    'EN_LLAMADA': 'CALL',
    'AFTERCALL': 'AFTERCALL',
    'BREAK': 'BREAK',
    'ALMUERZO': 'LUNCH',
    'BAÑO': 'BATHROOM',
    'NO_DISPONIBLE': 'BUSY',
    'DESCONECTADO': 'OFFLINE',
  };

  const currentStateFrontend = estadoMapping[currentState] || 'OFFLINE';

  // Handler para abrir el diálogo de confirmación
  const handleSelectChange = (event) => {
    const newState = event.target.value;
    setSelectedState(newState);
    setDialogOpen(true);
    setError('');
  };

  // Handler para cancelar el cambio
  const handleCancel = () => {
    setDialogOpen(false);
    setSelectedState('');
    setComentarios('');
    setError('');
  };

  // Handler para confirmar el cambio
  const handleConfirm = async () => {
    if (!selectedState) return;

    setLoading(true);
    setError('');

    try {
      // Obtener el valor backend del estado seleccionado
      const estadoObj = AGENT_STATUSES.find(s => s.value === selectedState);
      const backendValue = estadoObj?.backendValue || selectedState;

      // Cambiar el estado usando la API
      await changeAgentState(
        agentId,
        backendValue,
        comentarios || `Estado cambiado por coordinador`
      );

      // Notificar al componente padre
      if (onStateChanged) {
        onStateChanged(backendValue);
      }

      // Cerrar diálogo
      handleCancel();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      setError(err.response?.data?.detail || 'Error al cambiar el estado. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Obtener el color del estado actual
  const getCurrentColor = () => {
    const estado = AGENT_STATUSES.find(s => s.value === currentStateFrontend);
    return estado?.color || '#9e9e9e';
  };

  return (
    <>
      {/* Select del estado - solo muestra visualmente, el click abre diálogo */}
      <Select
        value={currentStateFrontend}
        onChange={handleSelectChange}
        disabled={disabled || loading}
        size="small"
        sx={{
          minWidth: 150,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: getCurrentColor(),
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: getCurrentColor(),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: getCurrentColor(),
          },
        }}
        renderValue={(value) => {
          const estado = AGENT_STATUSES.find(s => s.value === value);
          return (
            <Chip
              label={estado?.label || 'Desconocido'}
              size="small"
              sx={{
                bgcolor: estado?.color || '#9e9e9e',
                color: 'white',
                fontWeight: 600,
                fontSize: '11px',
                letterSpacing: '0.5px',
              }}
            />
          );
        }}
      >
        {AGENT_STATUSES.map((status) => (
          <MenuItem key={status.value} value={status.value}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: status.color,
                }}
              />
              <span>{status.label}</span>
            </Box>
          </MenuItem>
        ))}
      </Select>

      {/* Diálogo de confirmación */}
      <Dialog
        open={dialogOpen}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirmar Cambio de Estado
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ mb: 2 }}>
            ¿Estás seguro de cambiar el estado del agente a{' '}
            <strong>
              {AGENT_STATUSES.find(s => s.value === selectedState)?.label}
            </strong>?
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comentarios (opcional)"
            placeholder="Ej: Agente en break por solicitud del supervisor"
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Cambiando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
