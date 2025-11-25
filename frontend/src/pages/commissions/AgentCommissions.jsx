// Path: frontend/src/pages/commissions/AgentCommissions.jsx
import React, { useEffect, useState } from "react";
import MainLayout from "../../core/components/layout/MainLayout";

import RefreshIcon from "@mui/icons-material/Refresh";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  useTheme,
  Paper,
  Tooltip,
} from "@mui/material";

import { getComisiones, getComisionesResumen } from "@/core/api/commissions";
import "../Kpis/Kpis.css";
// ===== Helpers de fechas =====
const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayRange = () => {
  const d = new Date();
  const iso = toLocalDateString(d);
  return { from: iso, to: iso };
};

const weekRange = () => {
  const d = new Date();
  const dayOfWeek = d.getDay(); // 0 domingo ... 6 sábado
  const monday = new Date(d);
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(d.getDate() - daysFromMonday);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return {
    from: toLocalDateString(monday),
    to: toLocalDateString(saturday),
  };
};

const monthRange = () => {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    from: toLocalDateString(start),
    to: toLocalDateString(end),
  };
};

// ===== Conexión a API de comisiones =====
// Usaremos `getComisiones` y `getComisionesResumen` para obtener datos reales.

export default function AgentCommissions() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Por defecto: Mes actual
  const month = monthRange();
  const [mode, setMode] = useState("month"); // "day" | "week" | "month" | "custom"
  const [from, setFrom] = useState(month.from);
  const [to, setTo] = useState(month.to);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [reloadToken, setReloadToken] = useState(0); // para simular refresco

  // Ajustar rango cuando cambia el modo
  useEffect(() => {
    let r;
    if (mode === "day") r = todayRange();
    else if (mode === "week") r = weekRange();
    else if (mode === "month") r = monthRange();
    else r = { from, to };

    if (mode !== "custom") {
      setFrom(r.from);
      setTo(r.to);
    }
  }, [mode]);

  // Cargar datos reales desde la API de comisiones
  useEffect(() => {
    let cancelled = false;

    const mapPeriod = (m) => {
      if (m === "day") return "dia";
      if (m === "week") return "semana";
      if (m === "month") return "mes";
      return "personalizado";
    };

    const load = async () => {
      setLoading(true);
      setErrorMsg("");

      try {
        const periodo = mapPeriod(mode);

        const [listData, resumenData] = await Promise.all([
          getComisiones({ periodo, fecha_desde: from, fecha_hasta: to }),
          getComisionesResumen({ periodo, fecha_desde: from, fecha_hasta: to }),
        ]);

        if (cancelled) return;

        // Normalizar items: backend puede devolver array o objeto con key
        let itemsRaw = [];
        if (Array.isArray(listData)) itemsRaw = listData;
        else if (listData && listData.results) itemsRaw = listData.results;
        else if (listData && listData.comisiones) itemsRaw = listData.comisiones;

        const itemsMapped = itemsRaw.map((c) => ({
          id: c.comision_id || c.id,
          date: c.fecha ? String(c.fecha).split("T")[0] : "",
          saleId: c.venta || null,
          description: c.producto_nombre || c.producto || "",
          amount: c.monto_venta || null,
          commission: c.cantidad || 0,
          status: c.estado || "CONFIRMADA",
        }));

        const totalCom = (resumenData && (resumenData.total_comisiones ?? resumenData.total)) || 0;
        const avg = (resumenData && (resumenData.promedio_comision ?? resumenData.promedio)) || 0;
        const ultima = resumenData && (resumenData.ultima_actualizacion || resumenData.ultima_actualizacion);

        const monthlyGoalDefault = 3000000;

        const summaryMapped = {
          totalCommission: Number(totalCom) || 0,
          currency: "COP",
          monthlyGoal: monthlyGoalDefault,
          periodLabel: (resumenData && (resumenData.periodo_display || resumenData.periodo)) || periodo,
          progressPct:
            monthlyGoalDefault > 0
              ? (Number(totalCom || 0) / monthlyGoalDefault) * 100
              : 0,
          updatedAt: ultima || new Date().toISOString(),
          promedio: Number(avg) || 0,
        };

        setData({ summary: summaryMapped, items: itemsMapped });
        setLastUpdated(summaryMapped.updatedAt);
      } catch (err) {
        console.error("Error cargando comisiones:", err);
        setErrorMsg(err?.message || "Error cargando comisiones");
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [mode, from, to, reloadToken]);

  const summary = data?.summary || null;
  const items = data?.items || [];

  const hasNoCommissions =
    !loading && !errorMsg && summary && summary.totalCommission === 0;

  const progress = summary ? summary.progressPct : 0;
  const safeProgress =
    progress < 0 ? 0 : progress > 100 ? 100 : Math.round(progress);

  const formatMoney = (value) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: summary?.currency || "COP",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const handleRefresh = () => {
    setReloadToken((t) => t + 1);
  };

  return (
    <MainLayout title="Comisiones">
      <Box sx={{ width: "100%", p: 3 }}>
        {/* HEADER */}
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
            Mis comisiones
          </Typography>
          
          <Tooltip title="Actualizar">
            <IconButton
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Actualizar comisiones"
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
                  backgroundColor: isDark
                    ? "rgba(42, 59, 112, 0.5)"
                    : "rgba(12, 21, 90, 0.5)",
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

        {/* FILTROS */}
        <div
          className="kpi-filters"
          style={{
            "--text-primary": theme.palette.text.primary,
            "--text-secondary": theme.palette.text.secondary,
            "--background-paper": theme.palette.background.paper,
            "--primary-main": theme.palette.primary.main,
            "--primary-dark": isDark ? theme.palette.primary.dark : "#1a2b7a",
            "--segmented-bg": isDark ? "rgba(255, 255, 255, 0.05)" : "#F0F4F8",
            "--segmented-border": isDark
              ? "rgba(255, 255, 255, 0.12)"
              : "rgba(12, 21, 90, 0.12)",
            "--segmented-hover": isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(12, 21, 90, 0.05)",
            "--date-bg": isDark ? "rgba(255, 255, 255, 0.05)" : "#F0F4F8",
            "--date-border": isDark
              ? "rgba(255, 255, 255, 0.15)"
              : "rgba(12, 21, 90, 0.15)",
          }}
        >
          <div className="segmented">
            <button
              className={mode === "day" ? "active" : ""}
              onClick={() => setMode("day")}
            >
              Día
            </button>
            <button
              className={mode === "week" ? "active" : ""}
              onClick={() => setMode("week")}
            >
              Semana
            </button>
            <button
              className={mode === "month" ? "active" : ""}
              onClick={() => setMode("month")}
            >
              Mes
            </button>
            <button
              className={mode === "custom" ? "active" : ""}
              onClick={() => setMode("custom")}
            >
              Personalizado
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
            <div className="dates">
              <label>
                Desde
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setMode("custom");
                  }}
                />
              </label>
              <label>
                Hasta
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setMode("custom");
                  }}
                />
              </label>
            </div>

            {lastUpdated && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.75rem",
                }}
              >
                Última actualización:{" "}
                {new Date(lastUpdated).toLocaleString("es-CO")}
              </Typography>
            )}
          </div>
        </div>

        {/* ESTADOS */}
        {errorMsg && (
          <Alert severity="error" variant="filled">
            {errorMsg}
          </Alert>
        )}

        {loading && !data && (
          <Box
            sx={{
              py: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Stack spacing={2} alignItems="center">
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Cargando comisiones...
              </Typography>
            </Stack>
          </Box>
        )}

        {hasNoCommissions && (
          <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
            No se encontraron comisiones para este rango de tiempo.
          </Alert>
        )}

        {/* CONTENIDO PRINCIPAL */}
        {summary && (
          <>
            {/* KPIs */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              sx={{ mb: 4 }}
            >
              {/* Total comisiones del periodo */}
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
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                    <MonetizationOnIcon color="primary" fontSize="large" />
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Total comisiones
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {summary.periodLabel}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "2.5rem",
                    }}
                    data-testid="total-commission"
                  >
                    {formatMoney(summary.totalCommission)}
                  </Typography>
                </CardContent>
              </Card>

              {/* Promedio de comisión */}
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
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                    <TrendingUpIcon color="primary" fontSize="large" />
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Promedio por venta
                    </Typography>
                  </Box>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "2.5rem",
                    }}
                  >
                    {formatMoney(summary.promedio)}
                  </Typography>
                </CardContent>
              </Card>

              {/* Meta mensual */}
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
                <CardContent sx={{ p: 3 }}>
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
                    Meta mensual
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      mb: 2,
                    }}
                  >
                    {formatMoney(summary.totalCommission)} / {formatMoney(summary.monthlyGoal)}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={safeProgress}
                    sx={{
                      height: 8,
                      borderRadius: 5,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(12,21,90,0.1)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 5,
                        background: "linear-gradient(90deg, #0a6b2b 0%, #0f8d3a 100%)",
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
                      display: "block",
                      textAlign: "center",
                    }}
                  >
                    {safeProgress}% completado
                  </Typography>
                </CardContent>
              </Card>
            </Stack>

            {/* Tabla de detalle */}
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
                  Detalle de comisiones
                </Typography>
                {items.length === 0 ? (
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
                      No se encontraron comisiones para este rango de tiempo.
                    </Typography>
                  </Paper>
                ) : (
                  <TableContainer
                    sx={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(12,21,90,0.02)",
                      borderRadius: 2,
                    }}
                  >
                    <Table>
                      <TableHead>
                        <TableRow
                          sx={{
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(12,21,90,0.08)",
                          }}
                        >
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              color: "text.primary",
                              fontSize: "0.875rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Fecha
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              color: "text.primary",
                              fontSize: "0.875rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            ID Venta
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              color: "text.primary",
                              fontSize: "0.875rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Descripción
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 700,
                              color: "text.primary",
                              fontSize: "0.875rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Monto venta
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 700,
                              color: "text.primary",
                              fontSize: "0.875rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Comisión
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 700,
                              color: "text.primary",
                              fontSize: "0.875rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Estado
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((row) => (
                          <TableRow
                            key={row.id}
                            sx={{
                              "&:hover": {
                                backgroundColor: isDark
                                  ? "rgba(255,255,255,0.08)"
                                  : "rgba(12,21,90,0.04)",
                              },
                            }}
                          >
                            <TableCell
                              sx={{
                                color: "text.secondary",
                                fontSize: "0.875rem",
                              }}
                            >
                              {row.date}
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "text.secondary",
                                fontSize: "0.875rem",
                              }}
                            >
                              {row.saleId}
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "text.secondary",
                                fontSize: "0.875rem",
                              }}
                            >
                              {row.description}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: "text.secondary",
                                fontSize: "0.875rem",
                              }}
                            >
                              {formatMoney(row.amount)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: "text.secondary",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                              }}
                            >
                              {formatMoney(row.commission)}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={row.status}
                                color={
                                  row.status === "CONFIRMADA"
                                    ? "success"
                                    : row.status === "PENDIENTE"
                                    ? "warning"
                                    : "default"
                                }
                                variant={
                                  row.status === "ANULADA" ? "outlined" : "filled"
                                }
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </MainLayout>
  );
}
