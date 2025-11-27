// PATH: src/pages/Dashboard/BackOfficeDashboard.jsx
// Dashboard de auditoría de llamadas con estadísticas y resumen

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
  IconButton,
  Stack,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import MainLayout from "@/core/components/layout/MainLayout";
import { callsService } from "@/core/api/Calls";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";



export default function BackOfficeDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalLlamadas: 0,
    llamadasAuditadas: 0,
    llamadasReportadas: 0,
    llamadasPendientes: 0,
  });
  const [auditTrendData, setAuditTrendData] = useState([]);
  const [chartLoadingError, setChartLoadingError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener datos de diferentes filtros
      const [allCalls, auditedCalls, reportedCalls] = await Promise.all([
        callsService.getHistory({ page_size: 1, page: 1 }),
        callsService.getHistory({ estado_auditoria: "AUDITADA", page_size: 1, page: 1 }),
        callsService.getHistory({ estado_reportada: "REPORTADA", page_size: 1, page: 1 }),
      ]);

      const total = allCalls.count || 0;
      const audited = auditedCalls.count || 0;
      const reported = reportedCalls.count || 0;
      const pending = total - audited;

      setStats({
        totalLlamadas: total,
        llamadasAuditadas: audited,
        llamadasReportadas: reported,
        llamadasPendientes: pending,
      });

      // Generar datos de tendencia de auditoría (últimos 7 días)
      try {
        const auditedFullData = await callsService.getHistory({
          estado_auditoria: "AUDITADA",
          page_size: 1000,
        });

        if (auditedFullData.results) {
          const auditsByDate = {};
          const today = new Date();

          // Inicializar últimos 7 días
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString("es-ES");
            auditsByDate[dateStr] = 0;
          }

          // Contar auditorías por fecha
          auditedFullData.results.forEach((call) => {
            if (call.fecha_auditoria) {
              const dateStr = new Date(call.fecha_auditoria).toLocaleDateString(
                "es-ES"
              );
              if (dateStr in auditsByDate) {
                auditsByDate[dateStr]++;
              }
            }
          });

          const trendData = Object.entries(auditsByDate).map(([date, count]) => ({
            fecha: date,
            auditorias: count,
          }));

          setAuditTrendData(trendData);
        }
      } catch (err) {
        console.error("Error al cargar tendencias:", err);
      }
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
      setError("No se pudieron cargar las estadísticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const auditPercentage =
    stats.totalLlamadas > 0
      ? Math.round((stats.llamadasAuditadas / stats.totalLlamadas) * 100)
      : 0;
  const reportedPercentage =
    stats.totalLlamadas > 0
      ? Math.round((stats.llamadasReportadas / stats.totalLlamadas) * 100)
      : 0;

  return (
    <MainLayout title="Dashboard">
      <Box sx={{ p: { xs: 2, md: 3 }, pb: 6 }}>
        {/* Header con título y botón refresh */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography variant="h4" fontWeight={700}>
            Estadísticas de auditoría de llamadas
          </Typography>
          <Tooltip title="Actualizar">
            <IconButton
              onClick={fetchStats}
              disabled={loading}
              size="large"
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: "#fff",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                  transform: "rotate(180deg)",
                },
                "&.Mui-disabled": {
                  backgroundColor: theme.palette.action.disabled,
                  color: "#fff",
                },
                transition: "all 0.3s ease",
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            No se pudieron cargar las estadísticas.
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
              {/* Tarjeta Total de Llamadas */}
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
                    Total de Llamadas
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "2.5rem",
                    }}
                  >
                    {stats.totalLlamadas}
                  </Typography>
                </CardContent>
              </Card>

              {/* Tarjeta Auditadas */}
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
                    Auditadas
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "2.5rem",
                    }}
                  >
                    {stats.llamadasAuditadas}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      mt: 1,
                      display: "block",
                    }}
                  >
                    {auditPercentage}% del total
                  </Typography>
                </CardContent>
              </Card>

              {/* Tarjeta Reportadas */}
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
                    Reportadas
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "2.5rem",
                    }}
                  >
                    {stats.llamadasReportadas}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      mt: 1,
                      display: "block",
                    }}
                  >
                    {reportedPercentage}% del total
                  </Typography>
                </CardContent>
              </Card>

              {/* Tarjeta Pendientes */}
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
                    Pendientes de Auditar
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "2.5rem",
                    }}
                  >
                    {stats.llamadasPendientes}
                  </Typography>
                </CardContent>
              </Card>
            </Stack>

            {/* Charts Row */}
            <Box sx={{ mb: 4 }}>
              {/* Audit Trends Chart */}
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
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 3,
                      color: "text.primary",
                    }}
                  >
                    Tendencia de Auditorías
                  </Typography>
                  {auditTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={auditTrendData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                        />
                        <XAxis
                          dataKey="fecha"
                          stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis
                          stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                          style={{ fontSize: "12px" }}
                        />
                        <ChartTooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
                            border: isDark
                              ? "1px solid rgba(255,255,255,0.1)"
                              : "1px solid rgba(0,0,0,0.1)",
                            borderRadius: "8px",
                            color: isDark ? "#ffffff" : "#000000",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="auditorias"
                          stroke="#2196F3"
                          strokeWidth={2}
                          dot={{ fill: "#2196F3", r: 5 }}
                          activeDot={{ r: 7 }}
                          name="Auditorías"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: 300,
                        color: "text.secondary",
                      }}
                    >
                      <Typography variant="body2">
                        Sin datos de auditorías en los últimos 7 días
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </>
        )}
      </Box>
    </MainLayout>
  );
}
