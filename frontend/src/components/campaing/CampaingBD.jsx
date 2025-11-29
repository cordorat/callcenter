//Path: src/components/campaing/CampaingBD.jsx
//Componente para mostrar y editar la información general de la campaña

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Grid, Paper, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Snackbar, Alert, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Pagination } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '@/core/context/AuthContext';
import apiClient from '@/core/api/apiClient';
import { ENDPOINTS } from '@/core/api/endpoints';
import { listarBasesDatos, eliminarBaseDatos } from '@/core/api/campaigns';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ClientesBaseDatosModal from './ClientesBaseDatosModal';

export default function Campaing({ selectedFile = null, onClearFile = null, onSelectBase = null, selectedBaseId = null, selectedCampaign = null }) {
  const theme = useTheme();
  const { user } = useAuth();
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [snackSeverity, setSnackSeverity] = useState('success');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 6; // cantidad de registros por página
  
  // Estados para el diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [baseToDelete, setBaseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Estados para el modal de clientes
  const [clientesModalOpen, setClientesModalOpen] = useState(false);
  const [selectedBaseForClientes, setSelectedBaseForClientes] = useState(null);
  
  // Verificar si el usuario es administrador
  const isAdmin = user?.role === 'ADMIN';

  const fetchBases = useCallback(async (pageNumber = 1) => {
    // No cargar si no hay campaña seleccionada
    if (!selectedCampaign) {
      setBases([]);
      setTotalCount(0);
      setTotalPages(1);
      return;
    }

    try {
      setLoading(true);
      const data = await listarBasesDatos(parseInt(selectedCampaign), pageNumber);
      setBases(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Error fetching bases:', err);
      setError('No se pudieron obtener las bases de datos');
      setSnackMessage('Error al cargar bases de datos');
      setSnackSeverity('error');
      setSnackOpen(true);
    } finally {
      setLoading(false);
    }
  }, [selectedCampaign]);

  useEffect(() => {
    fetchBases(page);
  }, [page, fetchBases]);

  // Resetear página cuando cambia la campaña
  useEffect(() => {
    setPage(1);
  }, [selectedCampaign]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleFileSelect = async (file) => {
    if (!selectedCampaign) {
      setSnackMessage('Selecciona una campaña primero');
      setSnackSeverity('warning');
      setSnackOpen(true);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('campana_id', selectedCampaign);

    try {
      setUploading(true);
      setError(null);
      const res = await apiClient.post(ENDPOINTS.CAMPAIGNS_UPLOAD, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.info('Upload response:', res.data);
      await fetchBases(page);
      setSnackMessage('Base de datos subida correctamente');
      setSnackSeverity('success');
      setSnackOpen(true);
    } catch (err) {
      console.error('Upload error', err);
      setError('Error al subir la base de datos');
      setSnackMessage('Error al subir la base de datos');
      setSnackSeverity('error');
      setSnackOpen(true);
    } finally {
      setUploading(false);
    }
  };

  // Cuando el padre pasa `selectedFile`, iniciamos la subida automáticamente
  useEffect(() => {
    if (selectedFile) {
      handleFileSelect(selectedFile).then(() => {
        if (typeof onClearFile === 'function') onClearFile();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  // Selección de base
  const [internalSelectedBaseId, setInternalSelectedBaseId] = useState(null);

  // Si el padre controla la selección, usar ese valor
  const selectedId = selectedBaseId !== undefined && selectedBaseId !== null ? selectedBaseId : internalSelectedBaseId;

  const handleRowClick = (id) => {
    setInternalSelectedBaseId(id);
    if (typeof onSelectBase === 'function') {
      onSelectBase(id);
    }
  };

  // Handlers para eliminación
  const handleDeleteClick = (event, base) => {
    event.stopPropagation(); // Evitar que se seleccione la fila
    setBaseToDelete(base);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!baseToDelete) return;
    
    setDeleting(true);
    try {
      const response = await eliminarBaseDatos(baseToDelete.id);
      
      setSnackMessage(response.message || 'Base de datos eliminada correctamente');
      setSnackSeverity('success');
      setSnackOpen(true);
      
      // Si la base eliminada estaba seleccionada, limpiar selección
      if (selectedId === baseToDelete.id) {
        setInternalSelectedBaseId(null);
        if (typeof onSelectBase === 'function') {
          onSelectBase(null);
        }
      }
      
      // Recargar lista de bases
      await fetchBases(page);
      
    } catch (error) {
      console.error('Error al eliminar base:', error);
      let errorMessage = 'Error al eliminar la base de datos';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      setSnackMessage(errorMessage);
      setSnackSeverity('error');
      setSnackOpen(true);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setBaseToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setBaseToDelete(null);
  };

  // Handlers para ver clientes
  const handleViewClientes = (event, base) => {
    event.stopPropagation(); // Evitar que se seleccione la fila
    setSelectedBaseForClientes(base);
    setClientesModalOpen(true);
  };

  const handleCloseClientesModal = () => {
    setClientesModalOpen(false);
    setSelectedBaseForClientes(null);
  };

  return (
  <Box sx={{ p: 0 }}>
      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 8 }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="outlined"
          sx={{
            width: '100%',
            minWidth: '320px',
            borderRadius: '10px',
            backgroundColor: theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)',
            borderWidth: '2px',
            borderColor: snackSeverity === 'success' ? '#0f9d58' :
              snackSeverity === 'error' ? '#d32f2f' :
                snackSeverity === 'warning' ? '#f57c00' : theme.palette.primary.main,
            boxShadow: theme.palette.mode === 'light'
              ? '0 4px 12px rgba(12, 21, 90, 0.15)'
              : '0 4px 12px rgba(0, 0, 0, 0.5)',
            '& .MuiAlert-icon': {
              fontSize: '1.3rem',
              color: snackSeverity === 'success' ? '#0f9d58' :
                snackSeverity === 'error' ? '#d32f2f' :
                  snackSeverity === 'warning' ? '#f57c00' : theme.palette.primary.main,
            },
            '& .MuiAlert-message': {
              fontSize: '0.9rem',
              fontWeight: 500,
              color: theme.palette.text.primary,
            },
          }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>
      {uploading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">Subiendo archivo...</Typography>
          <CircularProgress size={20} />
        </Box>
      )}

      {loading && !uploading ? (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: theme.palette.primary.main }} />
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            overflow: 'hidden',
            width: '100%',
            mx: 0
          }}
        >
          {error && (
            <Box sx={{ p: 2 }}>
              <Typography color="error" sx={{ fontWeight: 500 }}>{error}</Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)' }}>
                  <TableCell 
                    align="center"
                    sx={{ 
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      py: 2,
                    }}
                  >
                    ID
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      py: 2,
                    }}
                  >
                    Nombre
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      py: 2,
                    }}
                  >
                    Campaña
                  </TableCell>
                  <TableCell 
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      py: 2,
                    }}
                  >
                    Fecha de iteración
                  </TableCell>
                  <TableCell 
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      py: 2,
                    }}
                  >
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ border: 'none' }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 8,
                        flexDirection: 'column',
                        gap: 2,
                      }}>
                        <Typography
                          sx={{
                            color: theme.palette.mode === 'light'
                              ? 'rgba(12, 21, 90, 0.5)'
                              : 'rgba(255, 255, 255, 0.5)',
                            fontSize: '1.1rem',
                            fontWeight: 500,
                          }}
                        >
                          No hay bases cargadas
                        </Typography>
                        <Typography
                          sx={{
                            color: theme.palette.mode === 'light'
                              ? 'rgba(12, 21, 90, 0.4)'
                              : 'rgba(255, 255, 255, 0.4)',
                            fontSize: '0.9rem',
                          }}
                        >
                          Sube una base de datos para comenzar
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  bases.map((b, index) => (
                    <TableRow
                      key={b.id}
                      hover
                      selected={selectedId === b.id}
                      onClick={() => handleRowClick(b.id)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor:
                          selectedId === b.id
                            ? (theme.palette.mode === 'light' ? '#D2E4FC' : '#223A5A')
                            : theme.palette.mode === 'light'
                              ? (index % 2 === 0 ? 'white' : '#FAFCFE')
                              : (index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'),
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell 
                        align="center"
                        sx={{ 
                          color: theme.palette.text.primary,
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          borderBottom: theme.palette.mode === 'light'
                            ? '1px solid rgba(12, 21, 90, 0.1)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {b.id}
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          color: theme.palette.text.primary,
                          fontSize: '0.85rem',
                          borderBottom: theme.palette.mode === 'light'
                            ? '1px solid rgba(12, 21, 90, 0.1)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {b.nombre_bd}
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          color: theme.palette.text.secondary,
                          fontSize: '0.85rem',
                          borderBottom: theme.palette.mode === 'light'
                            ? '1px solid rgba(12, 21, 90, 0.1)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {b.campana || '-'}
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          color: theme.palette.text.secondary,
                          fontSize: '0.85rem',
                          borderBottom: theme.palette.mode === 'light' 
                            ? '1px solid rgba(12, 21, 90, 0.1)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {b.fecha_hora_inicio_iteracion ? new Date(b.fecha_hora_inicio_iteracion).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          color: theme.palette.text.secondary,
                          fontSize: '0.85rem',
                          borderBottom: theme.palette.mode === 'light' 
                            ? '1px solid rgba(12, 21, 90, 0.1)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          {/* Botón para ver clientes */}
                          <Tooltip title="Ver clientes" arrow>
                            <IconButton
                              onClick={(e) => handleViewClientes(e, b)}
                              size="small"
                              sx={{
                                bgcolor: 'action.hover',
                                '&:hover': {
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                },
                                transition: 'all 0.2s'
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {/* Botón para eliminar (solo admin) */}
                          {isAdmin && (
                            <Tooltip title="Eliminar base de datos" arrow>
                              <IconButton
                                onClick={(e) => handleDeleteClick(e, b)}
                                size="small"
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
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Paginación */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {bases.length} de {totalCount} bases de datos
                </Typography>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  shape="rounded"
                  size="medium"
                />
              </Box>
            </Box>
        </Paper>
      )}

      {/* Diálogo de confirmación para eliminar */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 2,
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Confirmar Eliminación
          </Typography>
        </DialogTitle>
        
        <DialogContent dividers sx={{ py: 2 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Esta acción no se puede deshacer. Todos los registros de clientes asociados a esta base de datos serán eliminados permanentemente.
          </Alert>
          
          <Typography>
            ¿Estás seguro de que deseas eliminar la base de datos <strong>"{baseToDelete?.nombre_bd}"</strong>?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button
            onClick={handleDeleteCancel}
            disabled={deleting}
            sx={{
              backgroundColor: theme.palette.primary.secondary,
              color: 'white',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: theme.palette.primary.secondary,
                opacity: 0.9
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={deleting}
            variant="contained"
            sx={{
              backgroundColor: '#d32f2f',
              color: 'white',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#b71c1c',
              }
            }}
          >
            {deleting ? 'Eliminando...' : 'Eliminar Base de Datos'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para ver clientes de la base de datos */}
      <ClientesBaseDatosModal
        open={clientesModalOpen}
        onClose={handleCloseClientesModal}
        baseDatosId={selectedBaseForClientes?.id}
        baseDatosNombre={selectedBaseForClientes?.nombre_bd}
      />
    </Box>
  );
}