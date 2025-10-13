import { forwardRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Zoom
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
  confirmColor = '#0C155A',
  cancelColor = '#777986',
  disableBackdropClick = true,
  disableEscapeKeyDown = true
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
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }
      }}
    >
      <DialogTitle 
        id="confirm-dialog-title" 
        sx={{ fontFamily: 'poppins', fontWeight: '600' }}
      >
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText 
          id="confirm-dialog-description" 
          sx={{ fontFamily: 'arimo, sans-serif', fontWeight: 500 }}
        >
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          sx={{
            backgroundColor: cancelColor,
            color: 'white',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: cancelColor,
              opacity: 0.9
            }
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          sx={{
            backgroundColor: confirmColor,
            color: 'white',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: confirmColor,
              opacity: 0.9
            }
          }}
          variant="contained"
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
