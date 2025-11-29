//Path: frontend/src/pages/Kpis/AgentesPage.jsx
/**
 * Página de listado de agentes para coordinador.
 * Muestra tabla con todos los agentes y permite hacer clic para ver detalle.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/core/components/layout/MainLayout';
import { getAgentes } from '@/core/api/kpis';
import AgentStateSelect from '@/components/AgentStateSelect';
import {
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Box,
  Chip,
  Button,
  CardContent,
  InputAdornment,
  useTheme,
  Typography,
  Pagination,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import SearchIcon from '@mui/icons-material/Search';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import BarChartIcon from '@mui/icons-material/BarChart';


export default function AgentesPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // Obtener lista de agentes
  useEffect(() => {
    const fetchAgentes = async () => {
      try {
        setLoading(true);
        const data = await getAgentes();
        setAgentes(data || []);
        setError('');
      } catch (err) {
        console.error('Error al cargar agentes:', err);
        setError('No se pudieron cargar los agentes. Intenta nuevamente.');
        setAgentes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentes();
  }, []);

  // Filtrar agentes por búsqueda
  const agentesFiltrados = agentes.filter((agente) =>
    agente.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    agente.email.toLowerCase().includes(search.toLowerCase())
  );

  // Paginación
  const totalPages = Math.ceil(agentesFiltrados.length / pageSize);
  const agentesPaginados = React.useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return agentesFiltrados.slice(startIndex, startIndex + pageSize);
  }, [agentesFiltrados, page, pageSize]);

  // Handler para cambio de página
  const handlePageChange = (event, value) => {
    setPage(value);
  };

  // Resetear página cuando se cambia búsqueda
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Navegar a detalles del agente
  const handleAgenteClick = (agente) => {
    navigate(`/kpis/agentes/${agente.id}`, {
      state: { agente },
    });
  };

  // Handler para cuando cambia el estado de un agente
  const handleStateChanged = (agenteId, nuevoEstado) => {
    // Actualizar el estado local del agente
    setAgentes(prevAgentes => 
      prevAgentes.map(agente => 
        agente.id === agenteId 
          ? { ...agente, estado_actual: nuevoEstado }
          : agente
      )
    );
  };

  // Mapear estado a color
  const getEstadoColor = (estado) => {
    const estadoMap = {
      DISPONIBLE: 'success',
      EN_LLAMADA: 'primary',
      AFTERCALL: 'info',
      BREAK: 'warning',
      ALMUERZO: 'warning',
      CAPACITACION: 'info',
      BAÑO: 'warning',
      NO_DISPONIBLE: 'error',
      DESCONECTADO: 'default',
      SIN_ESTADO: 'default',
    };
    return estadoMap[estado] || 'default';
  };

  return (
    <MainLayout title="Agentes">
      <Box sx={{ height: '100%', overflow: 'auto' }}>
        
        {/* Título de la página */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: '28px', fontWeight: 800, color: 'text.primary' }}>
            Agentes del Equipo
          </Typography>
          <Typography sx={{ fontSize: '14px', color: 'text.secondary', mt: 0.5 }}>
            Selecciona un agente para ver sus KPIs detallados
          </Typography>
        </Box>

        {/* Header con estadísticas */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
          {/* Tarjeta: Total de agentes */}
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 3, background: theme.palette.mode === 'light' ? 'linear-gradient(135deg, rgba(247, 250, 255, 1), rgba(255, 255, 255, 1))' : 'linear-gradient(135deg, rgba(47, 118, 230, 0.05), rgba(47, 118, 230, 0.02))' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '12px', flexShrink: 0, background: 'linear-gradient(135deg, #2f76e6 0%, #5a96ff 100%)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                <GroupIcon sx={{ fontSize: 28, color: 'white' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '32px', fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>{agentes.length}</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agentes Totales</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Tarjeta: Disponibles */}
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 3, background: theme.palette.mode === 'light' ? 'linear-gradient(135deg, rgba(232, 245, 233, 1), rgba(255, 255, 255, 1))' : 'linear-gradient(135deg, rgba(10, 107, 43, 0.08), rgba(10, 107, 43, 0.02))' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '12px', flexShrink: 0, background: 'linear-gradient(135deg, #0a6b2b 0%, #0f8d3a 100%)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                <CheckCircleIcon sx={{ fontSize: 28, color: 'white' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '32px', fontWeight: 800, color: '#0a6b2b', lineHeight: 1 }}>{agentes.filter((a) => a.estado_actual === 'DISPONIBLE').length}</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disponibles</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Tarjeta: En llamada */}
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 3, background: theme.palette.mode === 'light' ? 'linear-gradient(135deg, rgba(227, 242, 253, 1), rgba(255, 255, 255, 1))' : 'linear-gradient(135deg, rgba(47, 118, 230, 0.08), rgba(47, 118, 230, 0.02))' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '12px', flexShrink: 0, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                <PhoneInTalkIcon sx={{ fontSize: 28, color: 'white' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '32px', fontWeight: 800, color: '#1976d2', lineHeight: 1 }}>{agentes.filter((a) => a.estado_actual === 'EN_LLAMADA').length}</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>En Llamada</Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Barra de búsqueda moderna */}
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
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

        {/* Errores */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: theme.palette.primary.main }} />
          </Box>
        )}

        {/* Tabla de agentes */}
        {!loading && agentesFiltrados.length === 0 && (
          <Alert severity="info">No hay agentes disponibles.</Alert>
        )}

        {!loading && agentesFiltrados.length > 0 && (
          <Paper elevation={0} sx={{ backgroundColor: theme.palette.background.paper, borderRadius: 2, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary', borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Nombre</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary', borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Email</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary', borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Teléfono</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary', borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Estado</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary', borderBottom: `2px solid ${theme.palette.primary.main}`, py: 2 }}>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agentesPaginados.map((agente, index) => (
                    <TableRow
                      key={agente.id}
                      //onClick={() => navigate(`/kpis/agentes/${agente.id}`, { state: { agente } })}
                      sx={{
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'light' ? '#F8FBFF' : 'rgba(255, 255, 255, 0.05)',
                        },
                        backgroundColor: theme.palette.mode === 'light'
                          ? (index % 2 === 0 ? 'white' : '#FAFCFE')
                          : (index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'),
                        transition: 'background-color 0.2s ease',
                        cursor: 'pointer',
                      }}
                    >
                      <TableCell sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.85rem', borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, rgba(47, 118, 230, 0.12), rgba(47, 118, 230, 0.08))', color: 'primary.main', flexShrink: 0 }}>
                            <PersonIcon sx={{ fontSize: 16 }} />
                          </Box>
                          <span>{agente.nombre_completo}</span>
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ color: 'text.secondary', fontSize: '0.85rem', borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                        {agente.email}
                      </TableCell>
                      <TableCell align="center" sx={{ color: 'text.secondary', fontSize: '0.85rem', borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                        {agente.phone || '-'}
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <AgentStateSelect
                          agentId={agente.id}
                          currentState={agente.estado_actual}
                          onStateChanged={(nuevoEstado) => handleStateChanged(agente.id, nuevoEstado)}
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: theme.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <Tooltip title="Ver KPIs" arrow>
                          <IconButton
                            onClick={() => navigate(`/kpis/agentes/${agente.id}`, { state: { agente } })}
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
                            <BarChartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Paginación */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="body2" color="text.secondary">
                Mostrando {agentesPaginados.length} de {agentesFiltrados.length} agentes
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
        )}
      </Box>
    </MainLayout>
  );
}
