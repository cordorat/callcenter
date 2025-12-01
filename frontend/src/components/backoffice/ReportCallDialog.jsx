// PATH: src/components/backoffice/ReportCallDialog.jsx
// Diálogo para reportar una llamada

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  useTheme,
  Card,
} from "@mui/material";
import ReportIcon from "@mui/icons-material/Report";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatDuration = (seconds) => {
  if (!seconds) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

export default function ReportCallDialog({
  open,
  onClose,
  onConfirm,
  llamada,
  loading = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const charCount = description.length;
  const maxChars = 500;
  const minChars = 10;
  const isValid = charCount >= minChars && charCount <= maxChars;

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxChars) {
      setDescription(value);
      setError("");
    }
  };

  const handleProceed = () => {
    if (charCount < minChars) {
      setError(`La descripción debe contener al menos ${minChars} caracteres`);
      return;
    }
    if (charCount > maxChars) {
      setError(`La descripción no puede exceder ${maxChars} caracteres`);
      return;
    }
    setConfirmationOpen(true);
  };

  const handleConfirmReport = async () => {
    setConfirmationOpen(false);
    await onConfirm(description);
    setDescription("");
    setError("");
  };

  const handleClose = () => {
    setDescription("");
    setError("");
    setConfirmationOpen(false);
    onClose();
  };

  return (
    <>
      {/* Diálogo Principal - Crear Reporte */}
      <Dialog 
        open={open && !confirmationOpen} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          elevation: 2,
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Reportar Llamada
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Resumen de la Llamada */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: 'text.secondary',
                  mb: 1.5
                }}
              >
                Resumen de la Llamada
              </Typography>
              <Box sx={{ 
                p: 2, 
                backgroundColor: (theme) => theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: (theme) => theme.palette.mode === 'light' ? 'rgba(12, 21, 90, 0.12)' : 'rgba(255,255,255,0.12)'
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ 
                    p: 1.5, 
                    backgroundColor: (theme) => theme.palette.mode === 'light' ? 'white' : 'rgba(255,255,255,0.02)',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: (theme) => theme.palette.mode === 'light' ? 'rgba(12, 21, 90, 0.08)' : 'rgba(255,255,255,0.08)'
                  }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Teléfono
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontSize: '1rem' }}>
                      {llamada?.cliente_telefono || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    p: 1.5, 
                    backgroundColor: (theme) => theme.palette.mode === 'light' ? 'white' : 'rgba(255,255,255,0.02)',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: (theme) => theme.palette.mode === 'light' ? 'rgba(12, 21, 90, 0.08)' : 'rgba(255,255,255,0.08)'
                  }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Agente
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {llamada?.agente_nombre || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    p: 1.5, 
                    backgroundColor: (theme) => theme.palette.mode === 'light' ? 'white' : 'rgba(255,255,255,0.02)',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: (theme) => theme.palette.mode === 'light' ? 'rgba(12, 21, 90, 0.08)' : 'rgba(255,255,255,0.08)'
                  }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Fecha y Hora
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {llamada ? formatDate(llamada.fecha_hora_inicio) : '-'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Campo de Descripción */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: 'text.secondary',
                  mb: 1.5
                }}
              >
                Descripción del Reporte
                <Typography component="span" sx={{ color: 'error.main' }}>
                  {' '}
                  *
                </Typography>
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={5}
                placeholder="Describe el motivo del reporte (mínimo 10 caracteres)..."
                value={description}
                onChange={handleDescriptionChange}
                variant="outlined"
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: (theme) => theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)',
                  }
                }}
              />

              {/* Contador de caracteres */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      charCount < minChars
                        ? 'error.main'
                        : charCount > maxChars
                        ? 'error.main'
                        : 'text.secondary',
                    fontWeight: 600,
                  }}
                >
                  {charCount >= minChars && charCount <= maxChars
                    ? `✓ ${charCount}/${maxChars} caracteres`
                    : `${charCount}/${maxChars} caracteres`}
                </Typography>
              </Box>

              {/* Error */}
              {error && (
                <Alert severity="error" sx={{ mt: 1.5 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5, gap: 1.5 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            sx={{
              backgroundColor: (theme) => theme.palette.primary.secondary,
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: (theme) => theme.palette.primary.secondary,
                opacity: 0.9
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleProceed}
            variant="contained"
            disabled={!isValid || loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? 'Procesando...' : 'Confirmar Reporte'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmación */}
      <Dialog 
        open={confirmationOpen} 
        onClose={() => !loading && setConfirmationOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          elevation: 2,
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Confirmar Reporte
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              ¿Está seguro que desea reportar esta llamada? Esta acción se registrará con fecha, hora y usuario.
            </Typography>

            <Box sx={{ 
              p: 2, 
              backgroundColor: (theme) => theme.palette.mode === 'light' ? 'white' : 'rgba(255,255,255,0.02)',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: (theme) => theme.palette.mode === 'light' ? 'rgba(12, 21, 90, 0.08)' : 'rgba(255,255,255,0.08)'
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Descripción del Reporte
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, fontStyle: 'italic', wordBreak: 'break-word' }}>
                "{description}"
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5, gap: 1.5 }}>
          <Button
            onClick={() => setConfirmationOpen(false)}
            disabled={loading}
            sx={{
              backgroundColor: (theme) => theme.palette.primary.secondary,
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: (theme) => theme.palette.primary.secondary,
                opacity: 0.9
              }
            }}
          >
            Volver Atrás
          </Button>
          <Button
            onClick={handleConfirmReport}
            variant="contained"
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? 'Procesando...' : 'Sí, Reportar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
