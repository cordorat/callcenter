//Path: src/components/agentStatus/AgentStatus.jsx
/**
 * Componente de selector de estado del agente con integración completa al backend
 * Usa el hook useAgentState para manejar la sincronización con el backend
 * Incluye actualización automática cada 30 segundos
 * 
 * @param {Function} onStatusChange - Callback cuando cambia el estado (opcional)
 * @param {number} refreshInterval - Intervalo de actualización en ms (default: 30000)
 */

import * as React from "react";
import { 
  Select, 
  MenuItem, 
  FormControl, 
  Box, 
  CircularProgress, 
  Snackbar, 
  Alert,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button
} from '@mui/material';
import { useState } from "react";
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { useAgentState } from '@/hooks/useAgentState';
import { AGENT_STATUSES, requiresComments, mapFrontendToBackend } from '@/core/api/agentStates';

export default function AgentStatus({ onStatusChange, refreshInterval = 30000 }) {
  const {
    frontendState,
    loading,
    error,
    changing,
    isAvailable,
    canReceiveCalls,
    stateDisplay,
    changeState,
  } = useAgentState({ 
    autoLoad: true,
    refreshInterval 
  });

  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  const [commentDialog, setCommentDialog] = useState({
    open: false,
    pendingStatus: null,
    comment: ''
  });

  const handleChange = async (event) => {
    const newFrontendStatus = event.target.value;
    
    // Convertir al formato backend para verificar si requiere comentarios
    const backendStatus = mapFrontendToBackend(newFrontendStatus);
    
    // Verificar si requiere comentarios
    if (requiresComments(backendStatus)) {
      // Abrir el diálogo para pedir comentarios
      setCommentDialog({
        open: true,
        pendingStatus: newFrontendStatus,
        comment: ''
      });
      return;
    }

    // Si no requiere comentarios, cambiar directamente
    await performStateChange(newFrontendStatus, '');
  };

  const performStateChange = async (newFrontendStatus, comentarios) => {
    try {
      await changeState(newFrontendStatus, comentarios);
      
      // Obtener el label del nuevo estado
      const newStatusLabel = AGENT_STATUSES.find(s => s.value === newFrontendStatus)?.label || newFrontendStatus;
      
      // Notificar al componente padre
      if (onStatusChange) {
        onStatusChange(newFrontendStatus);
      }
      
      setSnackbar({
        open: true,
        message: `Estado cambiado a: ${newStatusLabel}`,
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || 'Error al cambiar el estado',
        severity: 'error'
      });
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentDialog.comment.trim()) {
      setSnackbar({
        open: true,
        message: 'Debes proporcionar un comentario',
        severity: 'warning'
      });
      return;
    }

    await performStateChange(commentDialog.pendingStatus, commentDialog.comment);
    
    // Cerrar el diálogo
    setCommentDialog({
      open: false,
      pendingStatus: null,
      comment: ''
    });
  };

  const handleCommentCancel = () => {
    setCommentDialog({
      open: false,
      pendingStatus: null,
      comment: ''
    });
    
    setSnackbar({
      open: true,
      message: 'El cambio de estado fue cancelado',
      severity: 'info'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) return <CircularProgress size={24} />;

  if (error) {
    return (
      <Tooltip title={`Error: ${error}`} arrow>
        <FormControl
          variant="standard"
          size="small"
          sx={{ 
            minWidth: 150, 
            minHeight: 40, 
            marginRight: 2, 
            backgroundColor: '#ffebee', 
            borderRadius: 2, 
            paddingX: 1, 
            justifyContent: 'center' 
          }}
        >
          <Select 
            value="OFFLINE" 
            disabled
            disableUnderline
            renderValue={() => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FiberManualRecordIcon sx={{ fontSize: 12, color: '#f44336' }} />
                Error de conexión
              </Box>
            )}
          />
        </FormControl>
      </Tooltip>
    );
  }

  return (
    <>
      <FormControl
        variant="standard"
        size="small"
        sx={{ 
          minWidth: 150, 
          minHeight: 40, 
          marginRight: 2, 
          backgroundColor: '#D3E8FB', 
          borderRadius: 2, 
          paddingX: 1, 
          justifyContent: 'center',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Select 
          value={frontendState || 'OFFLINE'} 
          onChange={handleChange} 
          disableUnderline
          disabled={changing}
          sx={{ flex: 1 }}
          renderValue={(selected) => {
            const selectedStatus = AGENT_STATUSES.find(s => s.value === selected);
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {changing ? (
                  <CircularProgress size={12} />
                ) : (
                  <FiberManualRecordIcon 
                    sx={{ fontSize: 12, color: selectedStatus?.color || '#9e9e9e' }} 
                  />
                )}
                {selectedStatus?.label || 'Desconocido'}
              </Box>
            );
          }}
        >
          {AGENT_STATUSES.map((s) => (
            <MenuItem 
              key={s.value} 
              value={s.value}
              disabled={s.disabled || false}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FiberManualRecordIcon 
                  sx={{ fontSize: 12, color: s.color }} 
                />
                {s.label}
              </Box>
            </MenuItem>
          ))}
        </Select>
        
        {/* Indicador de disponibilidad */}
        {canReceiveCalls && (
          <Tooltip title="Puede recibir llamadas" arrow>
            <CheckCircleIcon 
              sx={{ 
                fontSize: 16, 
                color: '#4caf50',
                marginLeft: 0.5 
              }} 
            />
          </Tooltip>
        )}
      </FormControl>

      {/* Diálogo para comentarios */}
      <Dialog 
        open={commentDialog.open} 
        onClose={handleCommentCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Comentario requerido para: {
            AGENT_STATUSES.find(s => s.value === commentDialog.pendingStatus)?.label || commentDialog.pendingStatus
          }
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Comentario"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={commentDialog.comment}
            onChange={(e) => setCommentDialog({
              ...commentDialog,
              comment: e.target.value
            })}
            placeholder="Escribe el motivo del cambio de estado..."
            helperText="Este comentario será registrado para auditoría"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCommentCancel} color="inherit">
            Cancelar
          </Button>
          <Button 
            onClick={handleCommentSubmit} 
            variant="contained" 
            color="primary"
            disabled={!commentDialog.comment.trim()}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8 }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="outlined"
          sx={{ 
            width: '100%',
            minWidth: '280px',
            borderRadius: '10px',
            backgroundColor: '#EBF5FE',
            borderWidth: '2px',
            borderColor: snackbar.severity === 'success' ? '#0f9d58' : 
                        snackbar.severity === 'error' ? '#d32f2f' : 
                        snackbar.severity === 'warning' ? '#f57c00' : '#0C155A',
            boxShadow: '0 4px 12px rgba(12, 21, 90, 0.15)',
            '& .MuiAlert-icon': {
              fontSize: '1.3rem',
              color: snackbar.severity === 'success' ? '#0f9d58' : 
                     snackbar.severity === 'error' ? '#d32f2f' : 
                     snackbar.severity === 'warning' ? '#f57c00' : '#0C155A',
            },
            '& .MuiAlert-message': {
              fontSize: '0.9rem',
              fontWeight: 500,
              color: '#0C155A',
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
