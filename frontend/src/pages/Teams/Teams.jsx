// Path: frontend/src/pages/Teams/Teams.jsx

import { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Grid,
    IconButton,
    Chip,
    Alert,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Groups as GroupsIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import MainLayout from '@/core/components/layout/MainLayout';
import TeamsComponent from '@/components/campaing/Teams';
import CreateTeamModal from '@/components/teams/CreateTeamModal';
import EditTeamModal from '@/components/teams/EditTeamModal';
import DeleteTeamModal from '@/components/teams/DeleteTeamModal';

/**
 * Vista principal de Equipos de Trabajo
 * Criterio 1.1: Accesible solo para rol JEFE_CENTRO
 * Criterio 1.2: Muestra tabla con Nombre, Campaña, Cantidad Agentes
 * Criterio 5.1: Se actualiza automáticamente después de crear/actualizar/eliminar
 */
const Teams = () => {
    const theme = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10); // AQUÍ: Cambia este número para cambiar registros por página

    // Modales
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedEquipo, setSelectedEquipo] = useState(null);

    /**
     * Fuerza la recarga del componente Teams
     */
    const refreshTeams = () => {
        setRefreshKey(prev => prev + 1);
    };

    /**
     * Maneja la búsqueda
     */
    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    /**
     * Abre el modal de creación
     * Criterio 2.1: Botón "Crear Equipo"
     */
    const handleOpenCreateModal = () => {
        setCreateModalOpen(true);
    };

    /**
     * Cierra el modal de creación
     */
    const handleCloseCreateModal = () => {
        setCreateModalOpen(false);
    };

    /**
     * Callback después de crear equipo exitosamente
     * Criterio 5.1: Actualiza la lista automáticamente
     */
    const handleTeamCreated = () => {
        setCreateModalOpen(false);
        refreshTeams();
    };

    /**
     * Abre el modal de edición
     */
    const handleOpenEditModal = (equipo) => {
        setSelectedEquipo(equipo);
        setEditModalOpen(true);
    };

    /**
     * Cierra el modal de edición
     */
    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setSelectedEquipo(null);
    };

    /**
     * Callback después de actualizar equipo exitosamente
     * Criterio 5.1: Actualiza la lista automáticamente
     */
    const handleTeamUpdated = () => {
        setEditModalOpen(false);
        setSelectedEquipo(null);
        refreshTeams();
    };

    /**
     * Abre el modal de eliminación
     */
    const handleOpenDeleteModal = (equipo) => {
        setSelectedEquipo(equipo);
        setDeleteModalOpen(true);
    };

    /**
     * Cierra el modal de eliminación
     */
    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
        setSelectedEquipo(null);
    };

    /**
     * Callback después de eliminar equipo exitosamente
     * Criterio 5.1: Actualiza la lista automáticamente
     */
    const handleTeamDeleted = () => {
        setDeleteModalOpen(false);
        setSelectedEquipo(null);
        refreshTeams();
    };

    // Gradientes según el tema
    const gradientBg = theme.palette.mode === 'light'
        ? 'linear-gradient(135deg, #2c86eeff 0%, #2a15e9ff 100%)'
        : 'linear-gradient(135deg, #0C155A 0%, #040c47ff 100%)';

    return (
        <MainLayout title="Equipos de Trabajo">
            <Box sx={{ height: '100%', overflow: 'auto' }}>
                {/* Header con gradiente adaptivo */}
                <Box
                    sx={{
                        background: gradientBg,
                        borderRadius: 3,
                        p: 4,
                        mb: 4,
                        boxShadow: theme.palette.mode === 'light'
                            ? '0 8px 32px rgba(102, 126, 234, 0.25)'
                            : '0 8px 32px rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2,
                        transition: 'all 0.3s ease'
                    }}
                >
                    <Box sx={{ color: 'white' }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <GroupsIcon sx={{ fontSize: 40 }} />
                            Equipos de Trabajo
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.95 }}>
                            Gestiona los equipos asignados a campañas activas
                        </Typography>
                    </Box>

                    {/* Criterio 2.1: Botón "Crear Equipo" */}
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<AddIcon />}
                        onClick={handleOpenCreateModal}
                        sx={{
                            bgcolor: theme.palette.mode === 'light' ? 'white' : 'rgba(255, 255, 255, 0.1)',
                            color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                            fontWeight: 600,
                            px: 4,
                            py: 1.5,
                            borderRadius: 2,
                            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                            boxShadow: theme.palette.mode === 'light'
                                ? '0 4px 12px rgba(0,0,0,0.15)'
                                : '0 4px 12px rgba(0,0,0,0.3)',
                            '&:hover': {
                                bgcolor: theme.palette.mode === 'light' ? 'grey.100' : 'rgba(255, 255, 255, 0.15)',
                                transform: 'translateY(-2px)',
                                boxShadow: theme.palette.mode === 'light'
                                    ? '0 6px 20px rgba(0,0,0,0.2)'
                                    : '0 6px 20px rgba(0,0,0,0.4)',
                            },
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Crear Equipo
                    </Button>
                </Box>

                {/* Barra de búsqueda moderna */}
                <Box sx={{ mb: 4 }}>
                    <TextField
                        fullWidth
                        placeholder="Buscar por nombre de equipo o campaña..."
                        value={searchTerm}
                        onChange={handleSearch}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'primary.main' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            maxWidth: 600,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                                bgcolor: 'background.paper',
                                boxShadow: theme.palette.mode === 'light'
                                    ? '0 2px 8px rgba(0,0,0,0.08)'
                                    : '0 2px 8px rgba(0,0,0,0.3)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: theme.palette.mode === 'light'
                                        ? '0 4px 12px rgba(0,0,0,0.12)'
                                        : '0 4px 12px rgba(0,0,0,0.4)',
                                },
                                '&.Mui-focused': {
                                    boxShadow: theme.palette.mode === 'light'
                                        ? '0 4px 16px rgba(102, 126, 234, 0.25)'
                                        : '0 4px 16px rgba(102, 126, 234, 0.15)',
                                }
                            }
                        }}
                    />
                </Box>

                {/* Componente de Teams reutilizado con paginación */}
                <TeamsComponent 
                    key={refreshKey}
                    searchTerm={searchTerm}
                    onEditTeam={handleOpenEditModal}
                    onDeleteTeam={handleOpenDeleteModal}
                    showActions={true}
                    pageSize={pageSize}
                />

                {/* Modal de creación */}
                <CreateTeamModal
                    open={createModalOpen}
                    onClose={handleCloseCreateModal}
                    onTeamCreated={handleTeamCreated}
                />

                {/* Modal de edición */}
                {selectedEquipo && editModalOpen && (
                    <EditTeamModal
                        open={editModalOpen}
                        onClose={handleCloseEditModal}
                        onTeamUpdated={handleTeamUpdated}
                        equipo={selectedEquipo}
                    />
                )}

                {/* Modal de eliminación */}
                {selectedEquipo && deleteModalOpen && (
                    <DeleteTeamModal
                        open={deleteModalOpen}
                        onClose={handleCloseDeleteModal}
                        onTeamDeleted={handleTeamDeleted}
                        equipo={selectedEquipo}
                    />
                )}
            </Box>
        </MainLayout>
    );
};

export default Teams;