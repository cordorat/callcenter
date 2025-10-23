// Path: frontend/src/components/teams/DeleteTeamModal.jsx

import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Alert,
    CircularProgress
} from '@mui/material';
import { deleteEquipo } from '@/core/api/equipos';
import { useTheme } from '@mui/material/styles';


/**
 * Modal de confirmación para eliminar un equipo
 * @param {boolean} open - Controla si el modal está abierto
 * @param {function} onClose - Función para cerrar el modal
 * @param {function} onTeamDeleted - Callback después de eliminar exitosamente
 * @param {object} equipo - Objeto del equipo a eliminar
 */
const DeleteTeamModal = ({ open, onClose, onTeamDeleted, equipo }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const theme = useTheme();
    /**
     * Maneja la eliminación del equipo
     */
    const handleDelete = async () => {
        if (!equipo) return;

        try {
            setLoading(true);
            setError(null);

            await deleteEquipo(equipo.equipo_id);

            // Notificar éxito
            if (onTeamDeleted) {
                onTeamDeleted();
            }

            // Cerrar modal
            handleClose();
        } catch (err) {
            console.error('[DeleteTeamModal] Error eliminando equipo:', err);
            setError(err.response?.data?.message || 'Error al eliminar el equipo');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cierra el modal y resetea estados
     */
    const handleClose = () => {
        if (!loading) {
            setError(null);
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                Eliminar Equipo
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Typography variant="body1" color="textPrimary">
                    ¿Estás seguro de que deseas eliminar el equipo "{equipo?.nombre}"? 
                    Los agentes quedarán disponibles para otros equipos.
                </Typography>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={handleClose}
                    disabled={loading}
                    sx={{ backgroundColor: theme.palette.secondary}}
                    variant="outlined"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleDelete}
                    disabled={loading}
                    sx={{ backgroundColor: theme.palette.primary.main}}
                    variant="contained"
                    startIcon={loading && <CircularProgress size={20} color="inherit" />}
                >
                    {loading ? 'Eliminando...' : 'Eliminar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteTeamModal;