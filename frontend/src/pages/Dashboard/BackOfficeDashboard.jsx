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
    <MainLayout title="Dashboard de Auditoría">
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
            Dashboard de Auditoría
          </Typography>
          <Tooltip title="Actualizar">
            <IconButton
              onClick={fetchStats}
              disabled={loading}
              size="large"
              sx={{
                backgroundColor: isDark ? "#2A3B70" : "#0C155A",
                color: "#fff",
                "&:hover": {
                  backgroundColor: isDark ? "#1F2E57" : "#0A1147",
                  transform: "rotate(180deg)",
                },
                "&.Mui-disabled": {
                  backgroundColor: isDark
                    ? "rgba(42, 59, 112, 0.5)"
                    : "rgba(12, 21, 90, 0.5)",
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
          </>
        )}
      </Box>
    </MainLayout>
  );
}
