// PATH: src/components/campaing/Campaings.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  Card,
  Pagination,
  TextField,
  InputAdornment
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Inventory as ProductIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { getCampaigns } from '@/core/api/campaigns';

export default function CampaignsComponent({
  onEditTeam,          // compatibilidad antigua
  onEditCampaign,      // nuevo prop
  showActions = false,
  refreshTrigger = 0,
}) {
  const theme = useTheme();
  const [campanas, setCampanas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCampanas();
  }, [refreshTrigger]);

  const loadCampanas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCampaigns();

      let campanasData = [];
      
      if (Array.isArray(response)) {
        campanasData = response;
      } else if (response.data && Array.isArray(response.data)) {
        campanasData = response.data;
      } else if (response.results && Array.isArray(response.results)) {
        campanasData = response.results;
      } else if (response.campanas && Array.isArray(response.campanas)) {
        campanasData = response.campanas;
      } else {
        console.error('[Campaings] Formato inesperado:', response);
        setError('Formato de respuesta inesperado. Verifica la consola.');
      }

      setCampanas(campanasData);
    } catch (err) {
      console.error('[Campaings] Error cargando campañas:', err);
      setError(err.response?.data?.message || 'Error al cargar las campañas');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(1); // Resetear a primera página
  };

  // Filtrar campañas por búsqueda
  const campanasFilteradas = campanas.filter(campana =>
    campana.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campana.jefe_campana_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 5 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Cargando campañas...
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (campanas.length === 0 && !searchTerm) {
    return (
      <Card sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No hay campañas creadas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Crea tu primera campaña usando el botón "Nueva Campaña"
        </Typography>
      </Card>
    );
  }

  return (
    <Box>
      {/* Barra de búsqueda para campañas */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Buscar por nombre de campaña o jefe de campaña..."
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

      {campanasFilteradas.length === 0 ? (
        <Alert severity="warning">
          No se encontraron campañas con ese criterio de búsqueda
        </Alert>
      ) : (
      <Paper 
        elevation={0}
        sx={{ 
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TableContainer sx={{ overflowX: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor:
                    theme.palette.mode === 'light'
                      ? '#EBF5FE'
                      : 'rgba(255, 255, 255, 0.05)',
                  borderBottom: `2px solid ${theme.palette.primary.main}`,
                }}
              >
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: theme.palette.text.primary,
                    py: 2.5,
                  }}
                >
                  Campaña
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: theme.palette.text.primary,
                    py: 2.5,
                  }}
                >
                  Jefe de Campaña
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: theme.palette.text.primary,
                    py: 2.5,
                  }}
                >
                  Estado
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: theme.palette.text.primary,
                    py: 2.5,
                  }}
                >
                  Fechas
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: theme.palette.text.primary,
                    py: 2.5,
                  }}
                >
                  Productos
                </TableCell>

                {showActions && (
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: theme.palette.text.primary,
                      py: 2.5,
                      width: 100,
                    }}
                  >
                    Acciones
                  </TableCell>
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {campanasFilteradas.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((campana, index) => (
                <TableRow
                  key={campana.id}
                  hover
                  sx={{
                    backgroundColor:
                      theme.palette.mode === 'light'
                        ? index % 2 === 0
                          ? 'white'
                          : '#FAFCFE'
                        : index % 2 === 0
                          ? 'transparent'
                          : 'rgba(255, 255, 255, 0.02)',
                    '&:hover': {
                      backgroundColor:
                        theme.palette.mode === 'light'
                          ? '#F8FBFF'
                          : 'rgba(255, 255, 255, 0.05)',
                    },
                    transition: 'background-color 0.2s ease',
                    borderBottom: theme.palette.mode === 'light' 
                      ? '1px solid rgba(12, 21, 90, 0.1)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'default',
                  }}
                >
                {/* Nombre y descripción */}
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {campana.nombre}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '300px',
                      }}
                    >
                      {campana.descripcion || 'Sin descripción'}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Jefe de campaña */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Box>
                      <Typography variant="body2">
                        {campana.jefe_campana_nombre || '-'}
                      </Typography>
                      {campana.jefe_campana_codigo && (
                        <Typography variant="caption" color="text.secondary">
                          Código: {campana.jefe_campana_codigo}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>

                {/* Estado */}
                <TableCell align="center">
                  <Chip
                    label={campana.estado_nombre || 'Desconocido'}
                    color={campana.estado_nombre === 'ACTIVA' ? 'success' : 'default'}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>

                {/* Fechas */}
                <TableCell align="center">
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarIcon fontSize="small" color="action" sx={{ fontSize: '1rem' }} />
                      <Typography variant="caption" color="text.secondary">
                        Inicio:
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        {formatDate(campana.fecha_inicio)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarIcon fontSize="small" color="action" sx={{ fontSize: '1rem' }} />
                      <Typography variant="caption" color="text.secondary">
                        Fin:
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        {formatDate(campana.fecha_fin)}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                {/* Productos */}
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <ProductIcon fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight={600}>
                      {campana.cantidad_productos || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      producto{campana.cantidad_productos !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Acciones */}
                {showActions && (
                  <TableCell align="center">
                    <Tooltip title="Editar campaña" arrow placement="top">
                      <IconButton
                        size="small"
                        onClick={() => {
                          console.log('[Campaings] click editar', campana);
                          if (onEditCampaign) {
                            onEditCampaign(campana);
                          } else if (onEditTeam) {
                            onEditTeam(campana);
                          }
                        }}
                        sx={{
                          bgcolor: theme.palette.mode === 'light' 
                            ? 'rgba(66, 165, 245, 0.1)' 
                            : 'rgba(66, 165, 245, 0.2)',
                          '&:href': {
                            bgcolor: 'primary.main',
                            color: 'white',
                            transform: 'scale(1.1)',
                          },
                          '&:hover': {
                            bgcolor: 'primary.main',
                            color: 'white',
                            transform: 'scale(1.1)',
                          },
                          transition: 'all 0.2s',
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: theme.palette.background.paper }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando {campanasFilteradas.slice((page - 1) * rowsPerPage, page * rowsPerPage).length} de {campanasFilteradas.length} campañas
          </Typography>
          <Pagination
            count={Math.ceil(campanasFilteradas.length / rowsPerPage)}
            page={page}
            onChange={handleChangePage}
            color="primary"
            shape="rounded"
            size="medium"
          />
        </Box>
      </Paper>
      )}

      {/* Resumen */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Total: <strong>{campanas.length}</strong> {campanas.length === 1 ? 'campaña' : 'campañas'}
          {searchTerm && ` (${campanasFilteradas.length} mostradas)`}
        </Typography>
      </Box>
    </Box>
  );
}
