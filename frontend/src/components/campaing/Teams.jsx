//Path: src/components/campaing/Teams.jsx
//Componente para mostrar la lista de equipos de la campaña

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
  Pagination
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Groups as GroupsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { getEquipos } from '@/core/api/equipos';

export default function Teams({ 
  searchTerm = '', 
  onEditTeam, 
  onDeleteTeam, 
  showActions = false,
  pageSize = 6  // Cambia este número para más/menos registros por página
}) {
  const theme = useTheme();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Cargar equipos al montar el componente o cuando cambie searchTerm
  useEffect(() => {
    loadEquipos();
  }, [searchTerm, page]);

  /**
   * Carga la lista de equipos desde el backend
   */
  const loadEquipos = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        ...(searchTerm && { search: searchTerm }),
        page: page,
        page_size: pageSize
      };
      const response = await getEquipos(params);
      
      if (response.success) {
        setEquipos(response.equipos || []);
        setTotalCount(response.count || 0);
        setTotalPages(response.total_pages || 1);
      } else {
        setError('No se pudieron cargar los equipos');
      }
    } catch (err) {
      console.error('[Teams Component] Error cargando equipos:', err);
      setError(err.response?.data?.message || 'Error al cargar los equipos');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el cambio de página
   */
  const handlePageChange = (event, value) => {
    setPage(value);
  };

  return (
    <Box>
      {/* Mensajes de error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress sx={{ color: theme.palette.primary.main }} />
        </Box>
      )}

      {/* Estado vacío */}
      {!loading && equipos.length === 0 && (
        <Paper sx={{ 
          textAlign: 'center', 
          py: 8,
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
        }}>
          <GroupsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? 'No se encontraron equipos' : 'No hay equipos creados'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {searchTerm 
              ? 'Intenta con otro criterio de búsqueda'
              : 'Los equipos se crean desde el módulo de "Equipos" por el Jefe de Centro'
            }
          </Typography>
        </Paper>
      )}

      {/* Tabla de equipos */}
      {!loading && equipos.length > 0 && (
        <>
          <Paper 
            elevation={0}
            sx={{ 
              backgroundColor: theme.palette.background.paper,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
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
                      Nombre del Equipo
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
                      Campaña Asignada
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
                      Cantidad de Agentes
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
                      Miembros
                    </TableCell>
                    {showActions && (
                      <TableCell 
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: theme.palette.text.primary,
                          borderBottom: `2px solid ${theme.palette.primary.main}`,
                          py: 2,
                          width: 120,
                          textAlign: 'center'
                        }}
                      >
                        Acciones
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipos.map((equipo, index) => (
                    <TableRow
                      key={equipo.equipo_id}
                      sx={{
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'light' 
                            ? '#F8FBFF' 
                            : 'rgba(255, 255, 255, 0.05)',
                        },
                        backgroundColor: theme.palette.mode === 'light'
                          ? (index % 2 === 0 ? 'white' : '#FAFCFE')
                          : (index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'),
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      {/* Nombre del equipo */}
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
                        {equipo.nombre}
                      </TableCell>

                      {/* Campaña */}
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
                        {equipo.campana_info?.nombre || '-'}
                      </TableCell>

                      {/* Cantidad de agentes */}
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
                        {equipo.cantidad_agentes} {equipo.cantidad_agentes === 1 ? 'agente' : 'agentes'}
                      </TableCell>

                      {/* Miembros del equipo */}
                      <TableCell 
                        align="center"
                        sx={{ 
                          borderBottom: theme.palette.mode === 'light' 
                            ? '1px solid rgba(12, 21, 90, 0.1)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {equipo.agentes && equipo.agentes.length > 0 ? (
                          <Stack direction="row" flexWrap="wrap" gap={0.5} justifyContent="center">
                            {equipo.agentes.slice(0, 3).map((agente) => (
                              <Chip
                                key={agente.documento_id}
                                label={agente.full_name}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontWeight: 500,
                                  borderColor: theme.palette.primary.main,
                                  color: theme.palette.primary.main,
                                  fontSize: '0.75rem',
                                }}
                              />
                            ))}
                            {equipo.agentes.length > 3 && (
                              <Chip
                                label={`+${equipo.agentes.length - 3}`}
                                size="small"
                                sx={{
                                  fontWeight: 600,
                                  bgcolor: theme.palette.primary.main,
                                  color: 'white',
                                  fontSize: '0.75rem',
                                }}
                              />
                            )}
                          </Stack>
                        ) : (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: theme.palette.mode === 'light'
                                ? 'rgba(12, 21, 90, 0.5)'
                                : 'rgba(255, 255, 255, 0.5)',
                              fontSize: '0.85rem'
                            }}
                          >
                            Sin agentes
                          </Typography>
                        )}
                      </TableCell>

                      {/* Acciones */}
                      {showActions && (
                        <TableCell 
                          sx={{ 
                            borderBottom: theme.palette.mode === 'light' 
                              ? '1px solid rgba(12, 21, 90, 0.1)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                            textAlign: 'center'
                          }}
                        >
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="Editar equipo" arrow>
                              <IconButton
                                size="small"
                                onClick={() => onEditTeam && onEditTeam(equipo)}
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
                            <Tooltip title="Eliminar equipo" arrow>
                              <IconButton
                                size="small"
                                onClick={() => onDeleteTeam && onDeleteTeam(equipo)}
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
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {/* Paginación dentro de la tabla */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: theme.palette.background.paper }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {equipos.length} de {totalCount} equipos
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
          </Paper>

          
        </>
      )}
    </Box>
  );
}