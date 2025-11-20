// Path: frontend/src/pages/commissions/AgentCommissions.jsx
import React, { useEffect, useState } from "react";
import MainLayout from "../../core/components/layout/MainLayout";

import RefreshIcon from "@mui/icons-material/Refresh";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";

import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
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
  useMediaQuery,
  Tooltip as MuiTooltip,
} from "@mui/material";

import { getComisiones, getComisionesResumen } from "@/core/api/commissions";
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
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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
      <Box
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {/* HEADER */}
        <Stack
          direction={isMobile ? "column" : "row"}
          alignItems={isMobile ? "flex-start" : "center"}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Mis comisiones
            </Typography>
           
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            {lastUpdated && (
              <Chip
                icon={<AccessTimeIcon fontSize="small" />}
                label={`Última actualización: ${new Date(
                  lastUpdated
                ).toLocaleString()}`}
                variant="outlined"
                size="small"
              />
            )}
            <MuiTooltip title="Actualizar comisiones">
              <span>
                <IconButton
                  onClick={handleRefresh}
                  disabled={loading}
                  color="primary"
                  aria-label="Actualizar comisiones"
                >
                  {loading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <RefreshIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </MuiTooltip>
          </Stack>
        </Stack>

        {/* FILTROS */}
        <Card>
          <CardContent>
            <Stack
              direction={isMobile ? "column" : "row"}
              justifyContent="space-between"
              spacing={2}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Rango de tiempo
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  value={mode}
                  exclusive
                  onChange={(_, value) => {
                    if (value) setMode(value);
                  }}
                  aria-label="Seleccionar rango de tiempo de comisiones"
                >
                  <ToggleButton value="day" aria-label="Día">
                    Día
                  </ToggleButton>
                  <ToggleButton value="week" aria-label="Semana">
                    Semana
                  </ToggleButton>
                  <ToggleButton value="month" aria-label="Mes">
                    Mes
                  </ToggleButton>
                  <ToggleButton value="custom" aria-label="Personalizado">
                    Personalizado
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <Stack
                direction={isMobile ? "column" : "row"}
                spacing={2}
                alignItems={isMobile ? "flex-start" : "center"}
              >
                <TextField
                  size="small"
                  type="date"
                  label="Desde"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setMode("custom");
                  }}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Hasta"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setMode("custom");
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

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
          <Alert severity="info" variant="outlined">
            No se encontraron comisiones para este rango de tiempo.
          </Alert>
        )}

        {/* CONTENIDO PRINCIPAL */}
        {summary && (
          <Stack spacing={3}>
            {/* KPIs */}
            <Stack
              direction={isMobile ? "column" : "row"}
              spacing={2}
              alignItems={isMobile ? "stretch" : "flex-start"}
            >
              {/* Total periodo */}
              <Card sx={{ flex: 1, minWidth: 0 }}>
                <CardHeader
                  avatar={<MonetizationOnIcon color="primary" />}
                  title="Total comisiones del periodo"
                  subheader={summary.periodLabel}
                />
   I             <CardContent>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                    data-testid="total-commission"
                  >
                    {formatMoney(summary.totalCommission)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Este es el monto acumulado de tus comisiones en el rango de
                    tiempo seleccionado.
                  </Typography>
                </CardContent>
              </Card>

              {/* Meta mensual */}
              <Card sx={{ flex: 1, minWidth: 0 }}>
                <CardHeader
                  avatar={<TrendingUpIcon color="primary" />}
                  title="Meta mensual de comisiones"
                  subheader="Progreso frente a tu objetivo"
                />
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2" color="text.secondary">
                        Progreso
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {safeProgress}% de la meta
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={safeProgress}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="caption" color="text.secondary">
                        Meta mensual
                      </Typography>
                      <Chip
                        size="small"
                        label={formatMoney(summary.monthlyGoal)}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      ndicador  mensual de comisiones.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>

            {/* Tabla de detalle */}
            <Card>
              <CardHeader
                title="Detalle de comisiones"
                subheader="Ventas que generan comisión en el periodo seleccionado"
              />
              <CardContent>
                {items.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 2 }}
                  >
                    No se encontraron comisiones para este rango de tiempo.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha</TableCell>
                          <TableCell>ID Venta</TableCell>
                          <TableCell>Descripción</TableCell>
                          <TableCell align="right">Monto venta</TableCell>
                          <TableCell align="right">Comisión</TableCell>
                          <TableCell align="center">Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((row) => (
                          <TableRow key={row.id} hover>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>{row.saleId}</TableCell>
                            <TableCell>{row.description}</TableCell>
                            <TableCell align="right">
                              {formatMoney(row.amount)}
                            </TableCell>
                            <TableCell align="right">
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
                                  row.status === "ANULADA"
                                    ? "outlined"
                                    : "filled"
                                }
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
          </Stack>
        )}
      </Box>
    </MainLayout>
  );
}
