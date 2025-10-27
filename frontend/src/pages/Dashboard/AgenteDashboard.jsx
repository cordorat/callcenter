// PATH: src/pages/Dashboard/AgenteDashboard.jsx
import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import {
  Box,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Typography,
  Card,
  CardContent,
  Stack,
  Paper,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PhoneMissedIcon from "@mui/icons-material/PhoneMissed";
import { getKpiOverview } from "@/core/api/Kpis";
import { callsService } from "@/core/api/calls";
import { useTheme } from "@mui/material/styles";

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : "—");
const formatDuration = (s = 0) =>
  `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;

const estadoToChip = (estado) => {
  const map = {
    COMPLETADA: { label: "Contestada", color: "success" },
    NO_CONTESTADA: { label: "No contestada", color: "warning" },
    FALLIDA: { label: "Fallida", color: "error" },
    RECHAZADA: { label: "Rechazada", color: "default" },
  };
  return map[estado] || { label: estado || "N/A", color: "default" };
};

export default function AgenteDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const today = React.useMemo(() => toLocalDateString(new Date()), []);
  const [range] = React.useState({ from: today, to: today });

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [kpi, setKpi] = React.useState({
    llamadas: 0,
    ventas: 0,
    metaVentas: 0,
    tasaConversion: 0,
  });

  // Últimas llamadas (desde backend)
  const [lastCalls, setLastCalls] = React.useState([]);
  const [loadingCalls, setLoadingCalls] = React.useState(false);
  const [errorCalls, setErrorCalls] = React.useState(null);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const data = await getKpiOverview({ from: range.from, to: range.to });
      const values = data?.values || data || {};
      const meta = data?.meta || {};

      const llamadas = Number(
        values.llamadas_atendidas ?? values.llamadas ?? values.calls_total ?? 0
      );
      const ventas = Number(
        values.ventas_realizadas ?? values.ventas ?? values.sales_total ?? 0
      );
      const metaVentas = Number(meta.ventas_realizadas ?? 0);
      const tasaConvPct =
        values.tasa_conversion != null
          ? Math.round(Number(values.tasa_conversion) * 100)
          : llamadas > 0
          ? Math.round((ventas / llamadas) * 100)
          : 0;

      setKpi({ llamadas, ventas, metaVentas, tasaConversion: tasaConvPct });
    } catch (e) {
      console.error(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [range]);

  // Últimas 5 llamadas del historial (mismo rango del dashboard)
  const loadLastCalls = React.useCallback(async () => {
    try {
      setErrorCalls(null);
      setLoadingCalls(true);

      const payload = await callsService.getHistory({
        fecha_desde: range.from,
        fecha_hasta: range.to,
        page: 1,
        page_size: 5, // solo 5
      });

      const list = Array.isArray(payload) ? payload : payload.results || [];
      list.sort(
        (a, b) => new Date(b.fecha_hora_inicio) - new Date(a.fecha_hora_inicio)
      );
      setLastCalls(list.slice(0, 5));
    } catch (e) {
      console.error(e);
      setErrorCalls("No se pudieron cargar las últimas llamadas.");
      setLastCalls([]);
    } finally {
      setLoadingCalls(false);
    }
  }, [range.from, range.to]);

  React.useEffect(() => {
    load();
    loadLastCalls();
  }, [load, loadLastCalls]);

  const statusIcon = (estado) => {
    if (estado === "Contestado") return <CheckCircleIcon sx={{ color: "#0a6b2b" }} />;
    if (estado === "Fallida") return <CancelIcon sx={{ color: "#c41e3a" }} />;
    return <PhoneMissedIcon sx={{ color: isDark ? "#E6EDFF" : "#0C155A" }} />;
  };

  return (
    <MainLayout title="Dashboard">
      <Box sx={{ width: "100%", p: 3 }}>
        {/* Header con título y botón refresh */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              color: "text.primary",
              letterSpacing: "0.5px",
            }}
          >
            Estadísticas del día
          </Typography>
          <Tooltip title="Actualizar">
            <IconButton
              onClick={() => {
                load();
                loadLastCalls();
              }}
              disabled={loading || loadingCalls}
              aria-label="Actualizar"
              size="large"
              sx={{
                backgroundColor: isDark ? "#2A3B70" : "#0C155A",
                color: "#fff",
                transition: "all 0.3s ease",
                '&:hover': {
                  backgroundColor: isDark ? "#1F2E57" : "#0A1147",
                  transform: "rotate(180deg)",
                },
                '&.Mui-disabled': {
                  backgroundColor: isDark ? "rgba(42, 59, 112, 0.5)" : "rgba(12, 21, 90, 0.5)",
                  color: "rgba(255, 255, 255, 0.5)",
                },
              }}
            >
              <RefreshIcon
                sx={{
                  transition: "transform 0.6s ease",
                  animation: loading || loadingCalls ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            No se pudieron cargar los KPIs.
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "400px",
            }}
          >
            <CircularProgress size={60} />
          </Box>
        ) : (
          <>
            {/* KPI Cards Row */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              sx={{ mb: 4 }}
            >
              {/* Tarjeta Llamadas */}
              <Card
                sx={{
                  flex: 1,
                  backgroundColor: "background.paper",
                  borderRadius: 4,
                  boxShadow: isDark
                    ? "0 6px 16px rgba(0,0,0,0.35)"
                    : "0 6px 16px rgba(12,21,90,0.10)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: isDark
                      ? "0 8px 18px rgba(0,0,0,0.45)"
                      : "0 8px 18px rgba(12,21,90,0.18)",
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      mb: 2,
                    }}
                  >
                    Llamadas atendidas
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "2.5rem",
                    }}
                  >
                    {kpi.llamadas}
                  </Typography>
                </CardContent>
              </Card>

              {/* Tarjeta Ventas */}
              <Card
                sx={{
                  flex: 1,
                  backgroundColor: "background.paper",
                  borderRadius: 4,
                  boxShadow: isDark
                    ? "0 6px 16px rgba(0,0,0,0.35)"
                    : "0 6px 16px rgba(12,21,90,0.10)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: isDark
                      ? "0 8px 18px rgba(0,0,0,0.45)"
                      : "0 8px 18px rgba(12,21,90,0.18)",
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      mb: 2,
                    }}
                  >
                    Ventas realizadas
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "2.5rem",
                    }}
                  >
                    {kpi.ventas}
                  </Typography>
                </CardContent>
              </Card>

              {/* Tarjeta Tasa de Conversión */}
              <Card
                sx={{
                  flex: 1,
                  backgroundColor: "background.paper",
                  borderRadius: 4,
                  boxShadow: isDark
                    ? "0 6px 16px rgba(0,0,0,0.35)"
                    : "0 6px 16px rgba(12,21,90,0.10)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: isDark
                      ? "0 8px 18px rgba(0,0,0,0.45)"
                      : "0 8px 18px rgba(12,21,90,0.18)",
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      mb: 2,
                    }}
                  >
                    Tasa de conversión
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "2.5rem",
                    }}
                  >
                    {kpi.tasaConversion}%
                  </Typography>
                </CardContent>
              </Card>

              {/* Tarjeta Meta de Ventas 
              <Card
                sx={{
                  flex: 1,
                  backgroundColor: "background.paper",
                  borderRadius: 4,
                  border: isDark ? "1px solid #223053" : "1px solid #e0e0e0",
                  boxShadow: isDark
                    ? "0 6px 16px rgba(0,0,0,0.35)"
                    : "0 6px 16px rgba(12,21,90,0.10)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: isDark
                      ? "0 8px 18px rgba(0,0,0,0.45)"
                      : "0 8px 18px rgba(12,21,90,0.18)",
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      mb: 2,
                    }}
                  >
                    Meta de ventas
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "2.5rem",
                      mb: 2,
                    }}
                  >
                    {kpi.ventas}/{kpi.metaVentas || 10}
                  </Typography>
                  <Box sx={{ width: '100%', mt: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((kpi.ventas / (kpi.metaVentas || 10)) * 100, 100)}
                      sx={{
                        height: 8,
                        borderRadius: 5,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(12,21,90,0.1)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 5,
                          background: 'linear-gradient(90deg, #0a6b2b 0%, #0f8d3a 100%)',
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        mt: 1,
                        display: 'block',
                      }}
                    >
                      {Math.round((kpi.ventas / (kpi.metaVentas || 10)) * 100)}% completado
                    </Typography>
                  </Box>
                </CardContent>
              </Card>*/}
            </Stack>

            {/* Tabla de últimas llamadas */}
            <Card
              sx={{
                backgroundColor: "background.paper",
                borderRadius: 4,
                boxShadow: isDark
                  ? "0 6px 16px rgba(0,0,0,0.35)"
                  : "0 6px 16px rgba(12,21,90,0.10)",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: isDark
                    ? "0 8px 18px rgba(0,0,0,0.45)"
                    : "0 8px 18px rgba(12,21,90,0.18)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  sx={{
                    color: "text.primary",
                    mb: 3,
                    fontSize: "1.25rem",
                  }}
                >
                  Últimas llamadas realizadas
                </Typography>
                {errorCalls && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    {errorCalls}
                  </Alert>
                )}

                {loadingCalls ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: 200,
                    }}
                  >
                    <CircularProgress size={40} />
                  </Box>
                ) : lastCalls.length === 0 ? (
                  <Paper
                    sx={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#f4f7fb",
                      border: isDark
                        ? "2px dashed rgba(255,255,255,0.20)"
                        : "2px dashed #cfd7e6",
                      borderRadius: 3,
                      p: 4,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        color: isDark
                          ? "rgba(255,255,255,0.85)"
                          : "rgba(12,21,90,0.7)",
                        fontWeight: 500,
                      }}
                    >
                      Sin llamadas recientes
                    </Typography>
                  </Paper>
                ) : (
                  <Box sx={{ overflowX: "auto" }}>
                    <Table
                      sx={{
                        "& .MuiTableHead-root": {
                          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#EBF5FE",
                        },
                        "& .MuiTableCell-head": {
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          color: "text.primary",
                          borderBottom: `2px solid ${theme.palette.primary.main}`,
                          py: 2,
                          textAlign: "center",
                        },
                        "& .MuiTableCell-body": {
                          py: 1.5,
                          borderBottom: isDark
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid rgba(12,21,90,0.1)",
                          textAlign: "center",
                        },
                        "& .MuiTableRow-root:hover": {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "#F8FBFF",
                        },
                      }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>Cliente / Teléfono</TableCell>
                          <TableCell>Fecha y Hora</TableCell>
                          <TableCell>Duración</TableCell>
                          <TableCell>Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lastCalls.map((call) => {
                          const chip = estadoToChip(call.estado_llamada_valor);
                          return (
                            <TableRow key={call.id}>
                              <TableCell sx={{ textAlign: "left" }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  {statusIcon(call.estado_llamada_valor)}
                                  <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                      {call.cliente_nombre ||
                                        call.telefono_destino ||
                                        "N/A"}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "text.secondary",
                                        display: "block",
                                      }}
                                    >
                                      {call.cliente_telefono || call.telefono_destino}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {formatDateTime(call.fecha_hora_inicio)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {formatDuration(call.duracion || 0)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={chip.label}
                                  color={chip.color}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </MainLayout>
  );
}
