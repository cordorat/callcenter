import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/core/components/layout/MainLayout';
import { getAgentes } from '@/core/api/kpis';
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
  Card,
  CardContent,
  InputAdornment,
  useTheme,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import SearchIcon from '@mui/icons-material/Search';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import './AgentesPage.css';

/**
 * Página de listado de agentes para coordinador.
 * Muestra tabla con todos los agentes y permite hacer clic para ver detalle.
 */
export default function AgentesPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [agentes, setAgentes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');

  // Obtener lista de agentes
  React.useEffect(() => {
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

  // Navegar a detalles del agente
  const handleAgenteClick = (agente) => {
    navigate(`/kpis/agentes/${agente.id}`, {
      state: { agente },
    });
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
      <div className="agentes-page">
        {/* Header */}
        <div className="agentes-header">
          <div className="header-content">
            <h1>Agentes del Equipo</h1>
            <p className="subtitle">
              Selecciona un agente para ver sus KPIs detallados
            </p>
          </div>
        </div>

        {/* Tarjetas de Estadísticas */}
        <div className="stats-grid">
          <Card 
            className="stat-card"
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              background: isDark
                ? 'linear-gradient(135deg, rgba(47, 118, 230, 0.05), rgba(47, 118, 230, 0.02))'
                : 'linear-gradient(135deg, rgba(247, 250, 255, 1), rgba(255, 255, 255, 1))',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <div className="stat-icon-wrapper total">
                <GroupIcon />
              </div>
              <div className="stat-content">
                <div className="stat-value">{agentes.length}</div>
                <div className="stat-label">Agentes Totales</div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="stat-card"
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              background: isDark
                ? 'linear-gradient(135deg, rgba(10, 107, 43, 0.08), rgba(10, 107, 43, 0.02))'
                : 'linear-gradient(135deg, rgba(232, 245, 233, 1), rgba(255, 255, 255, 1))',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <div className="stat-icon-wrapper disponible">
                <CheckCircleIcon />
              </div>
              <div className="stat-content">
                <div className="stat-value disponible">
                  {agentes.filter((a) => a.estado_actual === 'DISPONIBLE').length}
                </div>
                <div className="stat-label">Disponibles</div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="stat-card"
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              background: isDark
                ? 'linear-gradient(135deg, rgba(47, 118, 230, 0.08), rgba(47, 118, 230, 0.02))'
                : 'linear-gradient(135deg, rgba(227, 242, 253, 1), rgba(255, 255, 255, 1))',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <div className="stat-icon-wrapper en-llamada">
                <PhoneInTalkIcon />
              </div>
              <div className="stat-content">
                <div className="stat-value en-llamada">
                  {agentes.filter((a) => a.estado_actual === 'EN_LLAMADA').length}
                </div>
                <div className="stat-label">En Llamada</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda */}
        <Card 
          className="search-card"
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <TextField
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              size="medium"
              variant="outlined"
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Errores */}
        {error && (
          <Alert severity="error" style={{ marginBottom: '16px' }}>
            {error}
          </Alert>
        )}

        {/* Tabla de agentes */}
        {loading ? (
          <div className="loading-container">
            <CircularProgress />
            <p>Cargando agentes...</p>
          </div>
        ) : agentes.length === 0 ? (
          <Alert severity="info">No hay agentes disponibles.</Alert>
        ) : (
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <TableContainer component={Paper} className="table-container" elevation={0}>
              <Table>
                <TableHead>
                  <TableRow className="table-header">
                    <TableCell>Nombre</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agentesFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" className="empty-row">
                        No se encontraron agentes
                      </TableCell>
                    </TableRow>
                  ) : (
                    agentesFiltrados.map((agente) => (
                      <TableRow
                        key={agente.id}
                        className="table-row"
                        onClick={() => handleAgenteClick(agente)}
                      >
                        <TableCell>
                          <div className="agent-name">
                            <div className="agent-avatar">
                              <PersonIcon />
                            </div>
                            <span>{agente.nombre_completo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="agent-email">{agente.email}</span>
                        </TableCell>
                        <TableCell>
                          <span className="agent-phone">{agente.phone || '-'}</span>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={agente.estado_actual}
                            color={getEstadoColor(agente.estado_actual)}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              fontSize: '11px',
                              letterSpacing: '0.5px',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            endIcon={<KeyboardArrowRightIcon />}
                            size="small"
                            variant="text"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAgenteClick(agente);
                            }}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '13px',
                            }}
                          >
                            Ver KPIs
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* Resultado de búsqueda */}
        {!loading && search && agentesFiltrados.length > 0 && (
          <div className="search-results">
            Mostrando {agentesFiltrados.length} de {agentes.length} agentes
          </div>
        )}
      </div>
    </MainLayout>
  );
}
