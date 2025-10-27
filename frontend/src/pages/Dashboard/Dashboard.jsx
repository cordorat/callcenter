// PATH: src/pages/Dashboard/Dashboard.jsx
import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import {
  Box,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PhoneMissedIcon from "@mui/icons-material/PhoneMissed";
import { getKpiOverview } from "@/core/api/Kpis";
import { callsService } from "@/core/api/calls";
import { useTheme } from "@mui/material/styles";

import "./Dashboard.css";

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const estadoToChip = (estado) => {
  const map = {
    COMPLETADA: { label: "Contestada", color: "success" },
    NO_CONTESTADA: { label: "No contestada", color: "warning" },
    FALLIDA: { label: "Fallida", color: "error" },
    RECHAZADA: { label: "Rechazada", color: "default" },
  };
  return map[estado] || { label: estado || "N/A", color: "default" };
};

const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : "—");
const formatDuration = (s = 0) =>
  `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;

export default function Dashboard() {
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

  // KPIs del día
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
    if (estado === "COMPLETADA")
      return <CheckCircleIcon className="state-icon success" />;
    if (estado === "FALLIDA")
      return <CancelIcon className="state-icon danger" />;
    if (estado === "NO_CONTESTADA")
      return <PhoneMissedIcon className="state-icon primary" />;
    if (estado === "RECHAZADA")
      return <CancelIcon className="state-icon primary" />;
    return <PhoneMissedIcon className="state-icon primary" />;
  };

  return (
    <MainLayout title="Dashboard">
      <Box
        className="dashboard-page"
        style={{
          "--primary": isDark ? "#E6EDFF" : "#0C155A",
          "--text-primary": theme.palette.text.primary,
          "--text-muted": theme.palette.text.secondary,
          "--card-bg": isDark ? "#0E152F" : "#ffffff",
          "--card-border": isDark ? "#223053" : "#ffffff",
          "--shadow": isDark
            ? "0 6px 16px rgba(0,0,0,0.35)"
            : "0 6px 16px rgba(12,21,90,0.10)",
          "--shadow-hover": isDark
            ? "0 8px 18px rgba(0,0,0,0.45)"
            : "0 8px 18px rgba(12,21,90,0.18)",
          "--btn-bg": isDark ? "#2A3B70" : "#0C155A",
          "--btn-bg-hover": isDark ? "#1F2E57" : "#0A1147",
          "--empty-bg": isDark ? "rgba(255,255,255,0.06)" : "#f4f7fb",
          "--empty-border": isDark ? "rgba(255,255,255,0.20)" : "#cfd7e6",
          "--empty-text": isDark
            ? "rgba(255,255,255,0.85)"
            : "rgba(12,21,90,0.7)",
        }}
      >
        {/* Header */}
        <div className="db-header">
          <h2>Estadísticas del día</h2>
          <Tooltip title="Actualizar">
            <IconButton
              onClick={() => {
                load();
                loadLastCalls();
              }}
              disabled={loading || loadingCalls}
              aria-label="Actualizar"
              className="refresh-btn"
              size="large"
            >
              <RefreshIcon
                className={loading || loadingCalls ? "spin" : ""}
              />
            </IconButton>
          </Tooltip>
        </div>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No se pudieron cargar los KPIs.
          </Alert>
        )}

        {loading ? (
          <Box className="db-loading">
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* KPIs */}
            <div className="kpi-row">
              <div className="kpi-pill">
                <div className="kpi-pill-label">Llamadas atendidas</div>
                <div className="kpi-pill-value">{kpi.llamadas}</div>
              </div>

              <div className="kpi-pill">
                <div className="kpi-pill-label">Ventas realizadas</div>
                <div className="kpi-pill-value">{kpi.ventas}</div>
              </div>

              <div className="kpi-pill">
                <div className="kpi-pill-label">Tasa de conversión</div>
                <div className="kpi-pill-value">{kpi.tasaConversion}%</div>
              </div>
            </div>

            {/* Últimas llamadas: 4 columnas (grid) */}
            <div className="db-card">
              <div className="db-card-title">Últimas llamadas realizadas</div>

              {errorCalls && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {errorCalls}
                </Alert>
              )}

              {loadingCalls ? (
                <Box className="db-loading" style={{ minHeight: 120 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : lastCalls.length === 0 ? (
                <div className="db-table">
                  <div className="db-empty">Sin llamadas recientes</div>
                </div>
              ) : (
                <div className="db-table-grid">
                  {/* Encabezado */}
                  <div className="db-grid db-head">
                    <div>Cliente / Teléfono</div>
                    <div>Fecha y hora</div>
                    <div>Duración</div>
                    <div>Estado</div>
                  </div>

                  {/* Filas */}
                  {lastCalls.map((row) => {
                    const chip = estadoToChip(row.estado_llamada_valor);
                    return (
                      <div key={row.id} className="db-grid db-row">
                        {/* Col 1: cliente / teléfono */}
                        <div>
                          <div className="cell-title">
                            {statusIcon(row.estado_llamada_valor)}
                            <span className="customer-name">
                              {row.cliente_nombre ||
                                row.telefono_destino ||
                                "N/A"}
                            </span>
                          </div>
                          <div className="cell-sub">
                            {row.cliente_telefono || row.telefono_destino}
                          </div>
                        </div>

                        {/* Col 2: fecha y hora */}
                        <div className="cell-datetime">
                          {formatDateTime(row.fecha_hora_inicio)}
                        </div>

                        {/* Col 3: duración */}
                        <div className="cell-duration">
                          {formatDuration(row.duracion || 0)}
                        </div>

                        {/* Col 4: estado (chip) */}
                        <div className="cell-state">
                          <Chip size="small" label={chip.label} color={chip.color} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </Box>
    </MainLayout>
  );
}
