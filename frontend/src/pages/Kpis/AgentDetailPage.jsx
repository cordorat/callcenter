import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '@/core/components/layout/MainLayout';
import DateRangeFilter from '@/components/kpis/DateRangeFilter';
import KPICards from '@/components/kpis/KPICards';
import { getAgenteKpiDetail } from '@/core/api/kpis';
import {
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import './AgentDetailPage.css';

/**
 * Página de detalle de KPI de un agente.
 * Muestra:
 * - Información del agente
 * - Selector de fechas
 * - Tarjetas de KPI
 * - Gráfica de llamadas por hora
 */
export default function AgentDetailPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { documentoId } = useParams();
  const location = useLocation();

  const [kpiData, setKpiData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [agente, setAgente] = React.useState(location.state?.agente || null);

  // Inicializar fechas (usando fecha local, no UTC)
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = getLocalDateString();
  const [fechaDesde, setFechaDesde] = React.useState(today);
  const [fechaHasta, setFechaHasta] = React.useState(today);

  // Obtener KPI detallado
  const fetchKpiDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAgenteKpiDetail(documentoId, {
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
      });
      setKpiData(data);

      // Actualizar datos del agente si vienen en la respuesta
      if (data && !agente) {
        setAgente({
          id: data.agente_id,
          nombre_completo: data.agente_nombre,
          email: data.agente_email,
        });
      }
    } catch (err) {
      console.error('Error al cargar KPI:', err);
      setError(
        err.response?.data?.detail ||
          'No se pudo cargar el KPI del agente. Intenta nuevamente.'
      );
      setKpiData(null);
    } finally {
      setLoading(false);
    }
  }, [documentoId, fechaDesde, fechaHasta, agente]);

  // Cargar KPI al montar o cambiar fechas
  React.useEffect(() => {
    fetchKpiDetail();
  }, [fetchKpiDetail]);

  // Manejar cambio de fechas
  const handleDateChange = ({ fechaDesde: nuevaFechaDesde, fechaHasta: nuevaFechaHasta }) => {
    setFechaDesde(nuevaFechaDesde);
    setFechaHasta(nuevaFechaHasta);
  };

  return (
    <MainLayout title={`KPIs - ${agente?.nombre_completo || 'Agente'}`}>
      <div className="agent-detail-page">
        {/* Header */}
        <div className="agent-detail-header">
          <div className="agent-detail-top-row">
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/kpis/agentes')}
              className="back-button"
              sx={{ 
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '14px',
                color: theme.palette.text.secondary,
                '&:hover': {
                  color: theme.palette.primary.main,
                  backgroundColor: 'transparent'
                }
              }}
            >
              Volver a Agentes
            </Button>

            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchKpiDetail}
              disabled={loading}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.2,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(47, 118, 230, 0.25)',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(47, 118, 230, 0.35)',
                }
              }}
            >
              Actualizar
            </Button>
          </div>

          <div className="agent-detail-info">
            <div>
              <h1>{agente?.nombre_completo || 'Cargando...'}</h1>
              <p className="agent-email">{agente?.email}</p>
            </div>
          </div>
        </div>

        {/* Filtro de fechas */}
        <Card 
          className="date-filter-card"
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <h3 style={{ marginBottom: '20px' }}>Período de Reporte</h3>
            <DateRangeFilter
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              onDateChange={handleDateChange}
              disabled={loading}
            />
          </CardContent>
        </Card>

        {/* Errores */}
        {error && (
          <Alert severity="error" style={{ marginBottom: '16px' }}>
            {error}
          </Alert>
        )}

        {/* Tarjetas KPI */}
        <KPICards kpiData={kpiData} loading={loading} />

        {/* Gráfica de llamadas por hora */}
        {kpiData && kpiData.llamadas_por_hora && (
          <Card 
            className="chart-card"
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              overflow: 'hidden',
              background: isDark 
                ? 'linear-gradient(135deg, rgba(47, 118, 230, 0.02), rgba(47, 118, 230, 0.01))'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(247, 250, 255, 1))',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <h3 style={{ marginBottom: '24px' }}>Llamadas por Hora</h3>
              <div className="chart-container">
                {loading ? (
                  <div className="chart-loading">
                    <CircularProgress />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={kpiData.llamadas_por_hora}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          {isDark ? (
                            <>
                              <stop offset="0%" stopColor="#4A8FE7" stopOpacity={1} />
                              <stop offset="100%" stopColor="#2f76e6" stopOpacity={0.9} />
                            </>
                          ) : (
                            <>
                              <stop offset="0%" stopColor="#2f76e6" stopOpacity={1} />
                              <stop offset="100%" stopColor="#5a96ff" stopOpacity={0.9} />
                            </>
                          )}
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="hora"
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        axisLine={{ stroke: theme.palette.divider }}
                      />
                      <YAxis
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        axisLine={{ stroke: theme.palette.divider }}
                        label={{
                          value: 'Llamadas',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 15,
                          style: {
                            fill: theme.palette.text.secondary,
                            fontWeight: 600,
                          },
                        }}
                      />
                      <Tooltip
                        cursor={{
                          fill: isDark
                            ? 'rgba(74, 143, 231, 0.1)'
                            : 'rgba(47, 118, 230, 0.1)',
                        }}
                        contentStyle={{
                          background: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: '8px',
                        }}
                      />
                      <Bar
                        dataKey="total"
                        fill="url(#barGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen de período */}
        {kpiData && (
          <Card 
            className="summary-card"
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              overflow: 'hidden',
              background: isDark
                ? 'linear-gradient(135deg, rgba(47, 118, 230, 0.05), rgba(47, 118, 230, 0.02))'
                : 'linear-gradient(135deg, rgba(247, 250, 255, 1), rgba(255, 255, 255, 1))',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <h3 style={{ marginBottom: '24px' }}>Resumen del Período</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Período Seleccionado</span>
                  <span className="summary-value">
                    {new Date(kpiData.fecha_desde).toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })} - {new Date(kpiData.fecha_hasta).toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total de Llamadas</span>
                  <span className="summary-value">{kpiData.total_llamadas}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Ventas Realizadas</span>
                  <span className="summary-value">{kpiData.ventas_realizadas}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Tasa de Conversión</span>
                  <span className="summary-value">{kpiData.tasa_conversion.toFixed(2)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
