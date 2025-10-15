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
  Stack
} from '@mui/material';
import {
  Groups as GroupsIcon
} from '@mui/icons-material';
import { getEquipos } from '@/core/api/equipos';

export default function Teams() {
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar equipos al montar el componente
  useEffect(() => {
    loadEquipos();
  }, []);

  /**
   * Carga la lista de equipos desde el backend
   */
  const loadEquipos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getEquipos();
      
      if (response.success) {
        setEquipos(response.equipos || []);
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
          <CircularProgress />
        </Box>
      )}

      {/* Estado vacío */}
      {!loading && equipos.length === 0 && (
        <Paper sx={{ textAlign: 'center', py: 8 }}>
          <GroupsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No hay equipos creados
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Los equipos se crean desde el módulo de "Equipos" por el Jefe de Centro
          </Typography>
        </Paper>
      )}

      {/* Tabla de equipos */}
      {!loading && equipos.length > 0 && (
        <Paper 
          elevation={0}
          sx={{ 
            backgroundColor: 'white',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#EBF5FE' }}>
                  <TableCell 
                    sx={{ 
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: '#0C155A',
                      borderBottom: '2px solid #0C155A',
                      py: 2,
                    }}
                  >
                    Nombre del Equipo
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: '#0C155A',
                      borderBottom: '2px solid #0C155A',
                      py: 2,
                    }}
                  >
                    Campaña Asignada
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: '#0C155A',
                      borderBottom: '2px solid #0C155A',
                      py: 2,
                    }}
                  >
                    Cantidad de Agentes
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: '#0C155A',
                      borderBottom: '2px solid #0C155A',
                      py: 2,
                    }}
                  >
                    Miembros
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {equipos.map((equipo, index) => (
                  <TableRow
                    key={equipo.equipo_id}
                    sx={{
                      '&:hover': {
                        backgroundColor: '#F8FBFF',
                      },
                      backgroundColor: index % 2 === 0 ? 'white' : '#FAFCFE',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Nombre del equipo */}
                    <TableCell 
                      sx={{ 
                        color: '#0C155A',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        borderBottom: '1px solid rgba(12, 21, 90, 0.1)',
                      }}
                    >
                      {equipo.nombre}
                    </TableCell>

                    {/* Campaña */}
                    <TableCell 
                      sx={{ 
                        color: 'rgba(12, 21, 90, 0.7)',
                        fontSize: '0.85rem',
                        borderBottom: '1px solid rgba(12, 21, 90, 0.1)',
                      }}
                    >
                      {equipo.campana_info?.nombre || '-'}
                    </TableCell>

                    {/* Cantidad de agentes */}
                    <TableCell 
                      sx={{ 
                        color: '#0C155A',
                        fontSize: '0.85rem',
                        borderBottom: '1px solid rgba(12, 21, 90, 0.1)',
                      }}
                    >
                      {equipo.cantidad_agentes} {equipo.cantidad_agentes === 1 ? 'agente' : 'agentes'}
                    </TableCell>

                    {/* Miembros del equipo */}
                    <TableCell 
                      sx={{ 
                        borderBottom: '1px solid rgba(12, 21, 90, 0.1)',
                      }}
                    >
                      {equipo.agentes && equipo.agentes.length > 0 ? (
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {equipo.agentes.slice(0, 3).map((agente) => (
                            <Chip
                              key={agente.documento_id}
                              label={agente.full_name}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontWeight: 500,
                                borderColor: '#0C155A',
                                color: '#0C155A',
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
                                bgcolor: '#0C155A',
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
                            color: 'rgba(12, 21, 90, 0.5)',
                            fontSize: '0.85rem'
                          }}
                        >
                          Sin agentes
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
