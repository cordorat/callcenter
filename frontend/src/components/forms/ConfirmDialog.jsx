import { forwardRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Zoom,
  CircularProgress
} from '@mui/material';

// Transición personalizada para el diálogo
const Transition = forwardRef(function Transition(props, ref) {
  return <Zoom ref={ref} {...props} />;
});

/**
 * Componente de diálogo de confirmación genérico y reutilizable
 * 
 * @param {boolean} open - Controla si el diálogo está visible
 * @param {function} onClose - Función llamada al cancelar
 * @param {function} onConfirm - Función llamada al confirmar
 * @param {string} title - Título del diálogo
 * @param {string} message - Mensaje descriptivo
 * @param {string} confirmText - Texto del botón de confirmación (default: "Confirmar")
 * @param {string} cancelText - Texto del botón de cancelar (default: "Cancelar")
 * @param {string} confirmColor - Color del botón de confirmación (default: "#0C155A")
 * @param {string} cancelColor - Color del botón de cancelar (default: "#777986")
 * @param {boolean} disableBackdropClick - Bloquear cierre al hacer clic fuera (default: true)
 * @param {boolean} disableEscapeKeyDown - Bloquear cierre con tecla ESC (default: true)
 */
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = (theme) => theme.palette.primary.main,
  cancelColor = (theme) => theme.palette.primary.secondary,
  disableBackdropClick = true,
  disableEscapeKeyDown = true,
  loading = false
}) => {
  const handleClose = (event, reason) => {
    // Bloquear cierre con ESC o click fuera si está habilitado
    if (
      (reason === 'backdropClick' && disableBackdropClick) ||
      (reason === 'escapeKeyDown' && disableEscapeKeyDown)
    ) {
      return;
    }
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      maxWidth="md"
      PaperProps={{
        elevation: 2,
        sx: {
          borderRadius: 3,
        }
      }}
    >
      <DialogTitle>
        <Typography 
          id="confirm-dialog-title" 
          variant="h6" 
          sx={{ fontWeight: 600 }}
        >
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2 }}>
        <Typography 
          id="confirm-dialog-description" 
          sx={{ fontWeight: 500 }}
        >
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{
            backgroundColor: (theme) => typeof cancelColor === 'function' ? cancelColor(theme) : cancelColor,
            color: 'white',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: (theme) => typeof cancelColor === 'function' ? cancelColor(theme) : cancelColor,
              opacity: 0.9
            }
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading}
          sx={{
            backgroundColor: (theme) => typeof confirmColor === 'function' ? confirmColor(theme) : confirmColor,
            color: 'white',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: (theme) => typeof confirmColor === 'function' ? confirmColor(theme) : confirmColor,
              opacity: 0.9
            }
          }}
          variant="contained"
          autoFocus
          startIcon={loading && <CircularProgress size={20} />}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
