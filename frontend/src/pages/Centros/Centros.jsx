//Path: frontend/src/pages/Centros/Centros.jsx
//Esta es la página de gestión de centros - Solo ADMIN

import { useState, useEffect } from 'react';
import MainLayout from '@/core/components/layout/MainLayout';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  PersonOff as PersonOffIcon
} from '@mui/icons-material';
import { centrosService } from '@/core/api/centros';
import { useTheme } from '@mui/material/styles';
import CrearCentro from './CrearCentro';
import EditarCentro from './EditarCentro';

export default function Centros() {
  const [centros, setCentros] = useState([]);
  const [allCentros, setAllCentros] = useState([]); // Todos los centros sin paginar
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedCentro, setSelectedCentro] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [centroToDelete, setCentroToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 6;
  const theme = useTheme();

  useEffect(() => {
    fetchCentros(page);
  }, [page]);

  const fetchCentros = async (pageNumber = 1) => {
    try {
      setLoading(true);
      setError('');
      const data = await centrosService.getCentros({ page: pageNumber, page_size: pageSize });
      setCentros(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / pageSize));
    } catch (err) {
      console.error('Error al cargar centros:', err);
      setError('Error al cargar la lista de centros');
    } finally {
      setLoading(false);
    }
  };

  // Cargar todos los centros cuando hay búsqueda
  const fetchAllCentros = async () => {
    try {
      const data = await centrosService.getCentros({ page: 1, page_size: 1000 });
      setAllCentros(data.results || []);
    } catch (err) {
      console.error('Error al cargar todos los centros:', err);
      setAllCentros([]);
    }
  };

  const handleCreateCentro = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);
  const handlePageChange = (event, value) => setPage(value);

  const handleSearchChange = (event) => {
    const newSearch = event.target.value;
    setSearchTerm(newSearch);
    setPage(1);
    
    // Si hay búsqueda, cargar todos los centros
    if (newSearch && allCentros.length === 0) {
      fetchAllCentros();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(1);
    setAllCentros([]);
  };

  // Cuando NO hay búsqueda, usar centros del backend (con paginación)
  // Cuando SÍ hay búsqueda, filtrar allCentros y paginar localmente
  let centrosMostrados = centros;
  let totalPaginasActual = totalPages;
  
  if (searchTerm) {
    // Con búsqueda: filtrar allCentros
    const centrosFiltrados = allCentros.filter(centro => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (centro.nombre && centro.nombre.toLowerCase().includes(searchLower)) ||
        (centro.direccion && centro.direccion.toLowerCase().includes(searchLower)) ||
        (centro.jefe_centro_nombre && centro.jefe_centro_nombre.toLowerCase().includes(searchLower))
      );
    });
    
    // Paginar los resultados filtrados
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    centrosMostrados = centrosFiltrados.slice(startIndex, endIndex);
    totalPaginasActual = Math.ceil(centrosFiltrados.length / pageSize);
  }

  const handleCentroCreated = () => {
    setOpenModal(false);
    fetchCentros(1);
    setPage(1);
    setSuccessMessage('Centro creado correctamente');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleEditCentro = (centro) => {
    setSelectedCentro(centro);
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setSelectedCentro(null);
  };

  const handleCentroUpdated = () => {
    setOpenEditModal(false);
    setSelectedCentro(null);
    fetchCentros(page);
    setSuccessMessage('Centro actualizado correctamente');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeleteCentro = (centro) => {
    setCentroToDelete(centro);
    setOpenDeleteDialog(true);
  };

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false);
    setCentroToDelete(null);
  };

  const confirmDeleteCentro = async () => {
    if (!centroToDelete) return;
    try {
      setDeleteLoading(true);
      setError('');
      await centrosService.deleteCentro(centroToDelete.id);
      setOpenDeleteDialog(false);
      setCentroToDelete(null);
      fetchCentros(1);
      setPage(1);
      setSuccessMessage('Centro eliminado correctamente');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Error al eliminar centro:', err);
      setError('No se pudo eliminar el centro. Puede tener dependencias asociadas.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Gradientes según el tema
  const gradientBg = theme.palette.mode === 'light'
    ? 'linear-gradient(135deg, #2c86eeff 0%, #2a15e9ff 100%)'
    : 'linear-gradient(135deg, #0C155A 0%, #040c47ff 100%)';

  return (
    <MainLayout title="Centros">
      <Box sx={{ height: '100%', overflow: 'auto' }}>
        {showSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}
        
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
              <BusinessIcon sx={{ fontSize: '40px' }} />
              Centros
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.95 }}>
              Gestiona los centros del call center
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleCreateCentro}
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
            Crear Centro
          </Button>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Buscador */}
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            placeholder="Buscar por nombre, dirección o jefe de centro..."
            value={searchTerm}
            onChange={handleSearchChange}
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

        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', backgroundColor: theme.palette.background.paper }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress sx={{ color: theme.palette.primary.main }} />
            </Box>
          ) : centros.length === 0 && !searchTerm ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 400,
                gap: 2,
                backgroundColor: theme.palette.background.paper,
                borderRadius: 2,
              }}
            >
              <BusinessIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary">
                No hay centros registrados
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateCentro}>
                Crear Primer Centro
              </Button>
            </Box>
          ) : centrosMostrados.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 400,
                gap: 2,
                backgroundColor: theme.palette.background.paper,
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" color="text.secondary">
                No se encontraron centros con ese criterio de búsqueda
              </Typography>
              <Button variant="text" onClick={handleClearSearch}>
                Limpiar búsqueda
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)' }}>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>ID</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Nombre</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Dirección</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Jefe de Centro</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: theme.palette.text.primary, borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {centrosMostrados.map((centro, index) => (
                      <TableRow
                        key={centro.id}
                        hover
                        sx={{
                          '&:hover': {
                            backgroundColor: theme.palette.mode === 'light' ? '#F8FBFF' : 'rgba(255, 255, 255, 0.05)',
                          },
                          backgroundColor: theme.palette.mode === 'light'
                            ? (index % 2 === 0 ? 'white' : '#FAFCFE')
                            : (index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'),
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 600, fontSize: '0.85rem', borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {centro.id}
                        </TableCell>
                        <TableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 600, fontSize: '0.85rem', borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {centro.nombre}
                        </TableCell>
                        <TableCell align="center" sx={{ color: theme.palette.text.secondary, fontSize: '0.85rem', borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)', maxWidth: 300 }}>
                          <Tooltip title={centro.direccion} arrow>
                            <Typography noWrap sx={{ fontSize: '0.85rem' }}>
                              {centro.direccion}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={{ borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {centro.jefe_centro_nombre ? (
                            <Chip
                              label={centro.jefe_centro_nombre}
                              size="small"
                              sx={{
                                fontWeight: 'bold',
                                border: '2px solid',
                                borderColor: theme.palette.success.main,
                                color: theme.palette.success.main,
                                backgroundColor: 'transparent',
                              }}
                            />
                          ) : (
                            <Chip
                              icon={<PersonOffIcon sx={{ fontSize: 16 }} />}
                              label="Sin asignar"
                              size="small"
                              sx={{
                                fontWeight: 'bold',
                                border: '2px solid',
                                borderColor: theme.palette.warning.main,
                                color: theme.palette.warning.main,
                                backgroundColor: 'transparent',
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="Editar centro" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleEditCentro(centro)}
                                sx={{
                                  bgcolor: 'action.hover',
                                  '&:hover': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                  },
                                  transition: 'all 0.2s'
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar centro" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteCentro(centro)}
                                sx={{
                                  bgcolor: 'action.hover',
                                  '&:hover': {
                                    bgcolor: 'error.main',
                                    color: 'white',
                                  },
                                  transition: 'all 0.2s'
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Paginación */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {centrosMostrados.length} de {searchTerm ? allCentros.filter(centro => {
                    const searchLower = searchTerm.toLowerCase();
                    return (
                      (centro.nombre && centro.nombre.toLowerCase().includes(searchLower)) ||
                      (centro.direccion && centro.direccion.toLowerCase().includes(searchLower)) ||
                      (centro.jefe_centro_nombre && centro.jefe_centro_nombre.toLowerCase().includes(searchLower))
                    );
                  }).length : totalCount} centros
                </Typography>
                <Pagination
                  count={totalPaginasActual}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  shape="rounded"
                  size="medium"
                />
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* Modal para crear centro */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
          }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={handleCloseModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 1,
              backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 3, pt: 1 }}>
          <CrearCentro isModal={true} onCentroCreated={handleCentroCreated} onCancel={handleCloseModal} />
        </DialogContent>
      </Dialog>

      {/* Dialogo de confirmación para eliminar centro */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCancelDelete}
        maxWidth="xs"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el centro{' '}
            <strong>{centroToDelete?.nombre}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelDelete} disabled={deleteLoading}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteCentro} disabled={deleteLoading}>
            {deleteLoading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para editar centro */}
      <Dialog
        open={openEditModal}
        onClose={handleCloseEditModal}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
          }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={handleCloseEditModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 1,
              backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 3, pt: 1 }}>
          <EditarCentro 
            centro={selectedCentro} 
            onCentroUpdated={handleCentroUpdated} 
            onCancel={handleCloseEditModal} 
          />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
