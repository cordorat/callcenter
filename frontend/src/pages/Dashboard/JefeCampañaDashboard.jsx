// PATH: src/pages/Dashboard/JefeCampañaDashboard.jsx
import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { getCampanaKpiOverview } from "@/core/api/kpis";
import {
  Box,
  Typography,
  Tooltip,
  Stack,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function JefeCampañaDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const today = React.useMemo(() => toLocalDateString(new Date()), []);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [kpi, setKpi] = React.useState({
    llamadas: 0,
    ventas: 0,
    tasaConversion: 0,
  });

  const [timelineData, setTimelineData] = React.useState([
    { hora: "08:00", llamadas: 0, ventas: 0 },
    { hora: "09:00", llamadas: 0, ventas: 0 },
    { hora: "10:00", llamadas: 0, ventas: 0 },
    { hora: "11:00", llamadas: 0, ventas: 0 },
    { hora: "12:00", llamadas: 0, ventas: 0 },
    { hora: "13:00", llamadas: 0, ventas: 0 },
    { hora: "14:00", llamadas: 0, ventas: 0 },
    { hora: "15:00", llamadas: 0, ventas: 0 },
    { hora: "16:00", llamadas: 0, ventas: 0 },
    { hora: "17:00", llamadas: 0, ventas: 0 },
    { hora: "18:00", llamadas: 0, ventas: 0 },
    { hora: "19:00", llamadas: 0, ventas: 0 },
  ]);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Usar getCampanaKpiOverview con los parámetros del día actual
      const data = await getCampanaKpiOverview({
        fecha_desde: today,
        fecha_hasta: today,
      });

      // Mapear valores del API al estado
      const llamadas = Number(data.llamadas_campaña ?? data.llamadas_totales ?? 0);
      const ventas = Number(data.ventas_realizadas ?? data.ventas ?? 0);
      
      // Calcular tasa de conversión
      let tasaConv = 0;
      if (llamadas > 0) {
        tasaConv = (ventas / llamadas) * 100;
      }

      setKpi({
        llamadas,
        ventas,
        tasaConversion: tasaConv,
      });

      // Procesar datos de línea temporal por hora
      if (data.timeline_por_hora && Array.isArray(data.timeline_por_hora)) {
        setTimelineData(data.timeline_por_hora);
      }
    } catch (e) {
      console.error(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [today]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <MainLayout title="Panel de Control - Jefe de Campaña">
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
            Estadísticas de Campaña
          </Typography>
          <Tooltip title="Actualizar">
            <IconButton
              onClick={load}
              disabled={loading}
              aria-label="Actualizar"
              size="large"
              sx={{
                backgroundColor: isDark ? "#2A3B70" : "#0C155A",
                color: "#fff",
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: isDark ? "#1F2E57" : "#0A1147",
                  transform: "rotate(180deg)",
                },
                "&.Mui-disabled": {
                  backgroundColor: isDark ? "rgba(42, 59, 112, 0.5)" : "rgba(12, 21, 90, 0.5)",
                  color: "rgba(255, 255, 255, 0.5)",
                },
              }}
            >
              <RefreshIcon
                sx={{
                  transition: "transform 0.6s ease",
                  animation: loading ? "spin 1s linear infinite" : "none",
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
            No se pudieron cargar los KPIs de la campaña.
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
            {/* KPI Cards Stack */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              sx={{ mb: 4, flexWrap: "wrap" }}
            >
              {/* Tarjeta Llamadas de Campaña */}
              <Card
                sx={{
                  flex: 1,
                  minWidth: 200,
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
                <CardContent sx={{ p: 3, textAlign: "center" }}>
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
                    Llamadas de Campaña
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

              {/* Tarjeta Ventas Realizadas */}
              <Card
                sx={{
                  flex: 1,
                  minWidth: 200,
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
                <CardContent sx={{ p: 3, textAlign: "center" }}>
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
                    Ventas Realizadas
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
                  minWidth: 200,
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
                <CardContent sx={{ p: 3, textAlign: "center" }}>
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
                    Tasa de Conversión
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "2.5rem",
                    }}
                  >
                    {kpi.tasaConversion.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Stack>

            {/* Línea Temporal - Llamadas y Ventas por hora */}
            <Card
              sx={{
                width: "100%",
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
                  Evolución del Día - Llamadas y Ventas
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={timelineData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                    />
                    <XAxis
                      dataKey="hora"
                      stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                      style={{ fontSize: "12px" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
                        border: isDark
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid rgba(0,0,0,0.1)",
                        borderRadius: "8px",
                        color: isDark ? "#ffffff" : "#000000",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [value, ""]}
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: "20px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="llamadas"
                      stroke={isDark ? "#64B5F6" : "#1976D2"}
                      strokeWidth={3}
                      dot={{ fill: isDark ? "#64B5F6" : "#1976D2", r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Llamadas"
                    />
                    <Line
                      type="monotone"
                      dataKey="ventas"
                      stroke={isDark ? "#81C784" : "#388E3C"}
                      strokeWidth={3}
                      dot={{ fill: isDark ? "#81C784" : "#388E3C", r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Ventas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </MainLayout>
  );
}
