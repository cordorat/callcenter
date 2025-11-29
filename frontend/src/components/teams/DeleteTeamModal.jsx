// Path: frontend/src/components/teams/DeleteTeamModal.jsx

import { useState } from 'react';
import ConfirmDialog from '@/components/forms/ConfirmDialog';
import { deleteEquipo } from '@/core/api/equipos';

/**
 * Modal de confirmación para eliminar un equipo
 * Usa ConfirmDialog para consistencia visual
 * 
 * @param {boolean} open - Controla si el modal está abierto
 * @param {function} onClose - Función para cerrar el modal
 * @param {function} onTeamDeleted - Callback después de eliminar exitosamente
 * @param {object} equipo - Objeto del equipo a eliminar
 */
const DeleteTeamModal = ({ open, onClose, onTeamDeleted, equipo }) => {
    const [loading, setLoading] = useState(false);

    /**
     * Maneja la eliminación del equipo
     */
    const handleDelete = async () => {
        if (!equipo) return;

        try {
            setLoading(true);

            await deleteEquipo(equipo.equipo_id);

            // Notificar éxito
            if (onTeamDeleted) {
                onTeamDeleted();
            }

            // Cerrar modal
            handleClose();
        } catch (err) {
            console.error('[DeleteTeamModal] Error eliminando equipo:', err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cierra el modal
     */
    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    return (
        <ConfirmDialog
            open={open}
            onClose={handleClose}
            onConfirm={handleDelete}
            title="Eliminar Equipo"
            message={`¿Estás seguro de que deseas eliminar el equipo "${equipo?.nombre}"? Los agentes quedarán disponibles para otros equipos.`}
            confirmText="Eliminar"
            cancelText="Cancelar"
            loading={loading}
        />
    );
};

export default DeleteTeamModal;