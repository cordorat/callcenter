// PATH: src/pages/Dashboard/Dashboard.jsx
import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import {
  Box,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PhoneMissedIcon from "@mui/icons-material/PhoneMissed";
// ⚠️ si tu archivo real es "kpis.js" en minúsculas, usa: "@/core/api/kpis"
import { getKpiOverview } from "@/core/api/Kpis";
import { useTheme } from "@mui/material/styles";

/* 
// ======== Donut Charts (Recharts) ========
// 💬 Se comenta toda la importación relacionada con el donut
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
*/

import "./Dashboard.css";

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

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
    tasaConversion: 0, // en %
  });

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

  React.useEffect(() => {
    load();
  }, [load]);

  /* 
  // 💬 Cálculo de cumplimiento (usado para el donut)
  const cumplimientoPct =
    kpi.metaVentas > 0 ? Math.min((kpi.ventas / kpi.metaVentas) * 100, 100) : 0;

  // 💬 Datos del gráfico circular (donut)
  const donutData = [
    { name: "Completado", value: Math.max(0, Math.min(cumplimientoPct / 100, 1)) },
    { name: "Pendiente", value: Math.max(0, 1 - Math.max(0, Math.min(cumplimientoPct / 100, 1))) },
  ];
  */

  // (opcional) si luego agregas filas reales en "Últimas llamadas"
  const statusIcon = (estado) => {
    if (estado === "Contestado") return <CheckCircleIcon sx={{ color: "#0a6b2b" }} />;
    if (estado === "Fallida") return <CancelIcon sx={{ color: "#c41e3a" }} />;
    return <PhoneMissedIcon sx={{ color: "var(--primary, #0C155A)" }} />;
  };

  return (
    <MainLayout title="Dashboard">
      <Box
        className="dashboard-page"
        style={{
          // Variables para light/dark mode
          "--primary": isDark ? "#E6EDFF" : "#0C155A",
          "--text-primary": theme.palette.text.primary,
          "--text-muted": theme.palette.text.secondary,
          "--card-bg": isDark ? "#0E152F" : "#ffffff",
          "--card-border": isDark ? "#223053" : "#ffffff",
          "--shadow": isDark ? "0 6px 16px rgba(0,0,0,0.35)" : "0 6px 16px rgba(12,21,90,0.10)",
          "--shadow-hover": isDark ? "0 8px 18px rgba(0,0,0,0.45)" : "0 8px 18px rgba(12,21,90,0.18)",
          "--btn-bg": isDark ? "#2A3B70" : "#0C155A",
          "--btn-bg-hover": isDark ? "#1F2E57" : "#0A1147",
          "--empty-bg": isDark ? "rgba(255,255,255,0.06)" : "#f4f7fb",
          "--empty-border": isDark ? "rgba(255,255,255,0.20)" : "#cfd7e6",
          "--empty-text": isDark ? "rgba(255,255,255,0.85)" : "rgba(12,21,90,0.7)",
        }}
      >
        {/* Header alineado a la izquierda con botón a la derecha */}
        <div className="db-header">
          <h2>Estadísticas del día</h2>
          <Tooltip title="Actualizar">
            <IconButton
              onClick={load}
              disabled={loading}
              aria-label="Actualizar"
              className="refresh-btn"
              size="large"
            >
              <RefreshIcon className={loading ? "spin" : ""} />
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
            {/* KPIs en fila */}
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

              {/*
              ==========================================================
              💬 BLOQUE COMPLETO DEL DONUT (comentado)
              ==========================================================
              
              <div className="kpi-pill-circle">
                <div className="kpi-circle-title">Cumplimiento de ventas</div>
                <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient id="completadoGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#0a6b2b" stopOpacity={1} />
                          <stop offset="100%" stopColor="#0f8d3a" stopOpacity={1} />
                        </linearGradient>
                        <linearGradient id="pendienteGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={isDark ? "#32456F" : "#e0e0e0"} stopOpacity={1} />
                          <stop offset="100%" stopColor={isDark ? "#415783" : "#f5f5f5"} stopOpacity={1} />
                        </linearGradient>
                      </defs>

                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="68%"
                        outerRadius="88%"
                        paddingAngle={2}
                        stroke={isDark ? "#0E152F" : "#ffffff"}
                        strokeWidth={3}
                      >
                        <Cell fill="url(#completadoGradient)" />
                        <Cell fill="url(#pendienteGradient)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="kpi-circle-text">
                  <div className="kpi-circle-pct">{Math.round(cumplimientoPct)}%</div>
                  <div className="kpi-circle-sub">
                    {kpi.ventas} / {kpi.metaVentas || 0}
                  </div>
                </div>
              </div>
              */}
            </div>

            {/* Tarjeta tabla (estructura) */}
            <div className="db-card">
              <div className="db-card-title">Últimas llamadas realizadas</div>
              <div className="db-table">
                <div className="db-empty">Sin llamadas recientes</div>
              </div>
            </div>
          </>
        )}
      </Box>
    </MainLayout>
  );
}
