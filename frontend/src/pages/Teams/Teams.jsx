// Path: frontend/src/pages/Teams/Teams.jsx

import { useState, useEffect } from 'react';
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
    CircularProgress,
    TextField,
    InputAdornment,
    Stack,
    Fade,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Groups as GroupsIcon,
    Campaign as CampaignIcon,
    People as PeopleIcon
} from '@mui/icons-material';
import MainLayout from '@/core/components/layout/MainLayout';
import { getEquipos, deleteEquipo } from '@/core/api/equipos';
import CreateTeamModal from '@/components/teams/CreateTeamModal';
import EditTeamModal from '@/components/teams/EditTeamModal';
import ConfirmDialog from '@/components/forms/ConfirmDialog';

/**
 * Vista principal de Equipos de Trabajo
 * Criterio 1.1: Accesible solo para rol JEFE_CENTRO
 * Criterio 1.2: Muestra tabla con Nombre, Campaña, Cantidad Agentes
 * Criterio 5.1: Se actualiza automáticamente después de crear/actualizar/eliminar
 */
const Teams = () => {
    const [equipos, setEquipos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modales
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedEquipo, setSelectedEquipo] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [equipoToDelete, setEquipoToDelete] = useState(null);

    // Cargar equipos al montar el componente
    useEffect(() => {
        loadEquipos();
    }, []);

    /**
     * Carga la lista de equipos desde el backend
     * Criterio 5.1: Función reutilizable para refrescar lista
     */
    const loadEquipos = async (search = '') => {
        try {
            setLoading(true);
            setError(null);
            const params = search ? { search } : {};
            const response = await getEquipos(params);

            if (response.success) {
                setEquipos(response.equipos || []);
            } else {
                setError('No se pudieron cargar los equipos');
            }
        } catch (err) {
            console.error('[Teams] Error cargando equipos:', err);
            setError(err.response?.data?.message || 'Error al cargar los equipos');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Maneja la búsqueda con debounce
     */
    const handleSearch = (event) => {
        const value = event.target.value;
        setSearchTerm(value);

        // Debounce: espera 500ms después de dejar de escribir
        const timeoutId = setTimeout(() => {
            loadEquipos(value);
        }, 500);

        return () => clearTimeout(timeoutId);
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
        loadEquipos(searchTerm); // Recargar lista
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
        loadEquipos(searchTerm); // Recargar lista
    };

    /**
     * Abre el diálogo de confirmación para eliminar
     */
    const handleOpenDeleteDialog = (equipo) => {
        setEquipoToDelete(equipo);
        setDeleteDialogOpen(true);
    };

    /**
     * Cierra el diálogo de eliminación
     */
    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setEquipoToDelete(null);
    };

    /**
     * Elimina un equipo (soft delete)
     * Criterio 5.1: Actualiza la lista automáticamente
     */
    const handleDeleteEquipo = async () => {
        if (!equipoToDelete) return;

        try {
            await deleteEquipo(equipoToDelete.equipo_id);
            handleCloseDeleteDialog();
            loadEquipos(searchTerm); // Recargar lista después de eliminar
        } catch (err) {
            console.error('[Teams] Error eliminando equipo:', err);
            setError(err.response?.data?.message || 'Error al eliminar el equipo');
        }
    };

    return (
        <MainLayout title="Equipos de Trabajo">
            <Box sx={{ height: '100%', overflow: 'auto' }}>
                {/* Header con gradiente */}
                <Box
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 3,
                        p: 4,
                        mb: 4,
                        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2
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
                            bgcolor: 'white',
                            color: 'primary.main',
                            fontWeight: 600,
                            px: 4,
                            py: 1.5,
                            borderRadius: 2,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            '&:hover': {
                                bgcolor: 'grey.100',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
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
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                },
                                '&.Mui-focused': {
                                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.25)',
                                }
                            }
                        }}
                    />
                </Box>

                {/* Mensajes de error */}
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Loading */}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {/* Estado vacío mejorado */}
                {!loading && equipos.length === 0 && (
                    <Fade in timeout={500}>
                        <Card
                            sx={{
                                textAlign: 'center',
                                py: 10,
                                borderRadius: 3,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    p: 3,
                                    borderRadius: '50%',
                                    bgcolor: 'white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    mb: 3
                                }}
                            >
                                <GroupsIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                                No hay equipos creados
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                                {searchTerm ? 'No se encontraron equipos con ese criterio de búsqueda' : 'Crea tu primer equipo para organizar agentes y asignarlos a campañas activas'}
                            </Typography>
                            {!searchTerm && (
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<AddIcon />}
                                    onClick={handleOpenCreateModal}
                                    sx={{
                                        px: 4,
                                        py: 1.5,
                                        borderRadius: 2,
                                        fontWeight: 600,
                                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                                        },
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    Crear Primer Equipo
                                </Button>
                            )}
                        </Card>
                    </Fade>
                )}

                {/* Grid de equipos mejorado - Criterio 1.2 */}
                {!loading && equipos.length > 0 && (
                    <Grid container spacing={3}>
                        {equipos.map((equipo, index) => (
                            <Grid item xs={12} md={6} lg={4} key={equipo.equipo_id}>
                                <Fade in timeout={300 + (index * 100)}>
                                    <Card
                                        sx={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            borderRadius: 3,
                                            position: 'relative',
                                            overflow: 'visible',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            transition: 'all 0.3s ease',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: 4,
                                                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                                borderTopLeftRadius: 12,
                                                borderTopRightRadius: 12,
                                            },
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                                            {/* Header con nombre y acciones */}
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
                                                <Box sx={{ flex: 1, mr: 1 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                                                        {equipo.nombre}
                                                    </Typography>
                                                </Box>
                                                <Stack direction="row" spacing={0.5}>
                                                    <Tooltip title="Editar equipo" arrow>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenEditModal(equipo)}
                                                            sx={{
                                                                bgcolor: 'action.hover',
                                                                '&:hover': {
                                                                    bgcolor: 'primary.main',
                                                                    color: 'white',
                                                                    transform: 'scale(1.1)'
                                                                },
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Eliminar equipo" arrow>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenDeleteDialog(equipo)}
                                                            sx={{
                                                                bgcolor: 'action.hover',
                                                                '&:hover': {
                                                                    bgcolor: 'error.main',
                                                                    color: 'white',
                                                                    transform: 'scale(1.1)'
                                                                },
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </Stack>

                                            {/* Campaña asignada */}
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: 'primary.50',
                                                    mb: 2
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 1.5,
                                                        bgcolor: 'primary.main',
                                                        mr: 1.5
                                                    }}
                                                >
                                                    <CampaignIcon sx={{ color: 'white', fontSize: 20 }} />
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                        Campaña
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 600,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {equipo.campana_info?.nombre || 'Sin campaña'}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Cantidad de agentes */}
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: 'success.50',
                                                    mb: 2
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 1.5,
                                                        bgcolor: 'success.main',
                                                        mr: 1.5
                                                    }}
                                                >
                                                    <PeopleIcon sx={{ color: 'white', fontSize: 20 }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                        Agentes asignados
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {equipo.cantidad_agentes} {equipo.cantidad_agentes === 1 ? 'agente' : 'agentes'}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Chips de agentes */}
                                            {equipo.agentes && equipo.agentes.length > 0 && (
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                                                        Miembros del equipo
                                                    </Typography>
                                                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                                                        {equipo.agentes.slice(0, 3).map((agente) => (
                                                            <Chip
                                                                key={agente.documento_id}
                                                                label={agente.full_name}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 500,
                                                                    bgcolor: 'background.default',
                                                                    border: '1px solid',
                                                                    borderColor: 'divider',
                                                                    '&:hover': {
                                                                        bgcolor: 'primary.50',
                                                                        borderColor: 'primary.main',
                                                                    }
                                                                }}
                                                            />
                                                        ))}
                                                        {equipo.agentes.length > 3 && (
                                                            <Chip
                                                                label={`+${equipo.agentes.length - 3}`}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    bgcolor: 'primary.main',
                                                                    color: 'white',
                                                                    border: '1px solid',
                                                                    borderColor: 'primary.main',
                                                                }}
                                                            />
                                                        )}
                                                    </Stack>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Fade>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Modal de creación */}
                <CreateTeamModal
                    open={createModalOpen}
                    onClose={handleCloseCreateModal}
                    onTeamCreated={handleTeamCreated}
                />

                {/* Modal de edición */}
                {selectedEquipo && (
                    <EditTeamModal
                        open={editModalOpen}
                        onClose={handleCloseEditModal}
                        onTeamUpdated={handleTeamUpdated}
                        equipo={selectedEquipo}
                    />
                )}

                {/* Diálogo de confirmación de eliminación */}
                <ConfirmDialog
                    open={deleteDialogOpen}
                    title="Eliminar Equipo"
                    message={`¿Estás seguro de que deseas eliminar el equipo "${equipoToDelete?.nombre}"? Los agentes quedarán disponibles para otros equipos.`}
                    onConfirm={handleDeleteEquipo}
                    onCancel={handleCloseDeleteDialog}
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                />
            </Box>
        </MainLayout>
    );
};

export default Teams;
