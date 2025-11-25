// PATH: src/pages/Dashboard/JefeCentroDashboard.jsx
// Página de dashboard para el rol JEFE DE CENTRO

import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { getJefeCentroDashboard } from "@/core/api/kpis";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function JefeCentroDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const today = React.useMemo(() => toLocalDateString(new Date()), []);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [kpi, setKpi] = React.useState({
    llamadasTotales: 0,
    ventasRealizadas: 0,
    tasaConversion: 0,
    campanasActivas: 0,
  });

  const [ventasData, setVentasData] = React.useState([]);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const data = await getJefeCentroDashboard({
        fecha_desde: today,
        fecha_hasta: today,
      });

      // Mapear los valores del API al estado
      const llamadasTotales = Number(data.llamadas_totales ?? 0);
      const ventasRealizadas = Number(data.ventas_realizadas ?? 0);
      const tasaConvPct = Number(data.tasa_conversion ?? 0);
      const campanasActivas = Number(data.campanas_activas ?? 0);

      setKpi({
        llamadasTotales,
        ventasRealizadas,
        tasaConversion: tasaConvPct,
        campanasActivas,
      });

      // Procesar datos de ventas por campaña
      if (data.ventas_por_campana && Array.isArray(data.ventas_por_campana)) {
        const chartData = data.ventas_por_campana.map((item) => ({
          nombre: item.campana_nombre || "Sin nombre",
          ventas: Number(item.ventas ?? 0) || 0,
        }));
        setVentasData(chartData);
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
            Estadísticas del Centro
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
            No se pudieron cargar los KPIs del centro.
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
          {/* Tarjeta Llamadas Totales */}
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
                Llamadas Totales
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  color: "text.primary",
                  fontWeight: 700,
                  fontSize: "2.5rem",
                }}
              >
                {kpi.llamadasTotales}
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
                {kpi.ventasRealizadas}
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

          {/* Tarjeta Campañas Activas */}
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
                Campañas Activas
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  color: "text.primary",
                  fontWeight: 700,
                  fontSize: "2.5rem",
                }}
              >
                {kpi.campanasActivas}
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* Ventas por Campaña - Gráfica */}
        <Card
          sx={{
            width: "100%",
            maxWidth: "100%",
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
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CardContent sx={{ p: 3, flexGrow: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                mb: 3,
                color: "text.primary",
              }}
            >
              Ventas por Campaña Activa
            </Typography>
            {ventasData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={ventasData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 150, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                  />
                  <XAxis
                    type="number"
                    stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                    style={{ fontSize: "14px" }}
                  />
                  <YAxis
                    dataKey="nombre"
                    type="category"
                    width={140}
                    tick={{ fontSize: 12 }}
                    stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
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
                    formatter={(value) => [`${value} ventas`, "Ventas"]}
                  />
                  <Bar
                    dataKey="ventas"
                    fill={isDark ? "#2A3B70" : "#0C155A"}
                    name="Ventas"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
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
                  Sin datos de ventas
                </Typography>
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
