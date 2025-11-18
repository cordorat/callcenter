//Path: src/components/campaing/ClientesBaseDatosModal.jsx
//Modal para visualizar clientes de una base de datos

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Alert,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import HomeIcon from '@mui/icons-material/Home';
import BadgeIcon from '@mui/icons-material/Badge';
import { getClientesPorBaseDatos } from '@/core/api/campaigns';

export default function ClientesBaseDatosModal({ open, onClose, baseDatosId, baseDatosNombre }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [baseDatosInfo, setBaseDatosInfo] = useState(null);
  const [error, setError] = useState(null);
  
  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  
  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  // Cargar clientes
  const loadClientes = async (pageNum = 1, search = '') => {
    if (!baseDatosId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page: pageNum,
        page_size: pageSize
      };
      
      if (search.trim()) {
        // Si parece un número de teléfono, buscar por teléfono
        if (/^\+?\d/.test(search.trim())) {
          params.telefono = search.trim();
        } else {
          // De lo contrario, buscar por nombre
          params.search = search.trim();
        }
      }
      
      const response = await getClientesPorBaseDatos(baseDatosId, params);
      
      setClientes(response.results || []);
      setBaseDatosInfo(response.base_datos);
      setTotalCount(response.count || 0);
      setTotalPages(response.total_pages || 1);
      setPage(response.current_page || 1);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      setError('Error al cargar los clientes. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Cargar clientes cuando se abre el modal o cambia la página
  useEffect(() => {
    if (open && baseDatosId) {
      loadClientes(page, searchTerm);
    }
  }, [open, baseDatosId, page]);
  
  // Resetear al abrir el modal
  useEffect(() => {
    if (open) {
      setPage(1);
      setSearchTerm('');
      setSearchInput('');
    }
  }, [open]);
  
  // Handler para búsqueda
  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1); // Resetear a página 1 al buscar
    loadClientes(1, searchInput);
  };
  
  // Handler para limpiar búsqueda
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setPage(1);
    loadClientes(1, '');
  };
  
  // Handler para cambio de página
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  // Handler para Enter en el campo de búsqueda
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          minHeight: '600px',
          maxHeight: '90vh',
          backgroundColor: theme.palette.background.paper,
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: theme.palette.text.primary,
          borderBottom: `2px solid ${theme.palette.primary.main}`,
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PersonIcon sx={{ fontSize: '2rem', color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Clientes - {baseDatosNombre || 'Base de Datos'}
            </Typography>
            {baseDatosInfo && (
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Campaña: {baseDatosInfo.campana_nombre}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ p: 3 }}>
        {/* Información de la base de datos */}
        {baseDatosInfo && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3, 
              borderRadius: '10px',
              backgroundColor: isDark ? 'rgba(47, 118, 230, 0.1)' : '#EBF5FE',
              '& .MuiAlert-icon': {
                color: theme.palette.primary.main
              }
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              <Chip
                label={`Total: ${totalCount} clientes`}
                size="small"
                sx={{ 
                  fontWeight: 600,
                  backgroundColor: theme.palette.primary.main,
                  color: 'white'
                }}
              />
              {baseDatosInfo.iteracion_activa && (
                <Chip
                  label="Iteración Activa"
                  size="small"
                  color="success"
                  sx={{ fontWeight: 600 }}
                />
              )}
              {baseDatosInfo.fecha_hora_inicio_iteracion && (
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  Iteración programada: {new Date(baseDatosInfo.fecha_hora_inicio_iteracion).toLocaleString()}
                </Typography>
              )}
            </Box>
          </Alert>
        )}

        {/* Buscador */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Buscar por nombre o teléfono..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                </InputAdornment>
              ),
              endAdornment: searchInput && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFB',
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              mt: 1,
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Buscar
          </Button>
        </Box>

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error */}
        {error && !loading && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        {/* Tabla de clientes */}
        {!loading && !error && (
          <>
            <Box sx={{ 
              overflowX: 'auto',
              borderRadius: '12px',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(12, 21, 90, 0.1)'}`,
            }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#EBF5FE' }}>
                    <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BadgeIcon fontSize="small" />
                        ID
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon fontSize="small" />
                        Nombre
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhoneIcon fontSize="small" />
                        Teléfono
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BadgeIcon fontSize="small" />
                        Documento
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon fontSize="small" />
                        Email
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HomeIcon fontSize="small" />
                        Dirección
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ border: 'none' }}>
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
                              color: theme.palette.text.secondary,
                              fontSize: '1.1rem',
                              fontWeight: 500,
                            }}
                          >
                            {searchTerm ? 'No se encontraron clientes con ese criterio' : 'No hay clientes registrados'}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientes.map((cliente, index) => (
                      <TableRow
                        key={cliente.cliente_id}
                        hover
                        sx={{
                          backgroundColor: index % 2 === 0 
                            ? (isDark ? 'transparent' : 'white')
                            : (isDark ? 'rgba(255, 255, 255, 0.02)' : '#FAFCFE'),
                        }}
                      >
                        <TableCell sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
                          {cliente.cliente_id}
                        </TableCell>
                        <TableCell sx={{ color: theme.palette.text.primary }}>
                          {cliente.nombre || '-'}
                        </TableCell>
                        <TableCell sx={{ color: theme.palette.text.primary }}>
                          {cliente.telefono || '-'}
                        </TableCell>
                        <TableCell sx={{ color: theme.palette.text.secondary }}>
                          {cliente.documento_id || '-'}
                        </TableCell>
                        <TableCell sx={{ color: theme.palette.text.secondary }}>
                          {cliente.email || '-'}
                        </TableCell>
                        <TableCell sx={{ color: theme.palette.text.secondary }}>
                          {cliente.direccion || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>

            {/* Paginación */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Mostrando {clientes.length} de {totalCount} clientes
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
            )}
          </>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
