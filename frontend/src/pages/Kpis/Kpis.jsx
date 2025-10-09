import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { getKpiOverview } from "@/core/api/kpis";
import "./Kpis.css"; 

import {
  CircularProgress,
  Alert,
} from "@mui/material";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const todayRange = () => {
  const d = new Date();
  const iso = d.toISOString().slice(0, 10);
  return { from: iso, to: iso };
};

const weekRange = () => {
  const d = new Date();
  const end = new Date(d);
  const start = new Date(d);
  start.setDate(d.getDate() - 6);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
};

const monthRange = () => {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
};

const fmtSecs = (s) => {
  const n = Number(s || 0);
  const m = Math.floor(n / 60);
  const ss = n % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")} min`;
};
const fmtPct = (x) => `${Math.round(Number(x || 0) * 100)}%`;

const DONUT_COLORS = ["#2f76e6", "#9ec9ff"];

export default function Kpis() {

  const [mode, setMode] = React.useState("day"); // day|week|month|custom
  const [from, setFrom] = React.useState(todayRange().from);
  const [to, setTo] = React.useState(todayRange().to);

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [errMsg, setErrMsg] = React.useState("");
  const [updatedAt, setUpdatedAt] = React.useState(null);

  React.useEffect(() => {
    let r = todayRange();
    if (mode === "week") r = weekRange();
    if (mode === "month") r = monthRange();
    if (mode !== "custom") {
      setFrom(r.from);
      setTo(r.to);
    }
  }, [mode]);

  const fetchData = async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const resp = await getKpiOverview({ from, to });
      setData(resp || null);
      setUpdatedAt(resp?.now || new Date().toISOString());
    } catch (e) {
      console.error(e);
      setErrMsg("No se pudieron cargar los KPIs. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [from, to]);

  const values = data?.values || {};
  const meta = data?.meta || {};
  const llamadasAtendidas = Number(values.llamadas_atendidas || 0);
  const llamadasAtendidasMeta = meta.llamadas_atendidas ?? null;

  const ventasRealizadas = Number(values.ventas_realizadas || 0);
  const ventasRealizadasMeta = meta.ventas_realizadas ?? null;

  const tpl = Number(values.tiempo_promedio_llamada || 0); // seg
  const tplMeta = meta.tiempo_promedio_llamada ?? null;

  const lxh = Number(values.llamadas_por_hora || 0);
  const lxhMeta = meta.llamadas_por_hora ?? null;

  const cumplimiento = Number(values.cumplimiento || 0); // 0..1
  const cumplimientoMeta = meta.cumplimiento ?? 1;

  const seriesHora = data?.series?.llamadas_por_hora || [];
  const donutData = React.useMemo(
    () => [
      { name: "Avance", value: Math.max(0, Math.min(cumplimiento, 1)) },
      { name: "Restante", value: Math.max(0, 1 - Math.max(0, Math.min(cumplimiento, 1))) },
    ],
    [cumplimiento]
  );

  return (
    <MainLayout title="KPI's">
      <div className="kpi-page">
        {/* Header */}
        <div className="kpi-header">
          <h2>KPI personales</h2>
          <div className="kpi-actions">
            {updatedAt && (
              <span className="update-badge">
                Última actualización: {new Date(updatedAt).toLocaleString()}
              </span>
            )}
            <button className="btn" onClick={fetchData} disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar métricas"}
            </button>
          </div>
        </div>

        {}
        <div className="kpi-filters">
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
        </div>

        {errMsg && (
          <div style={{ marginBottom: 14 }}>
            <Alert severity="error">{errMsg}</Alert>
          </div>
        )}

        {/* KPIs principales */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Llamadas atendidas</div>
            <div className="kpi-value-row">
              <div className="kpi-value">{llamadasAtendidas}</div>
              {llamadasAtendidasMeta != null && (
                <span
                  className={`kpi-chip ${
                    llamadasAtendidasMeta &&
                    llamadasAtendidas / (llamadasAtendidasMeta || 1) >= 1
                      ? "ok"
                      : "warn"
                  }`}
                >
                  meta {llamadasAtendidasMeta}
                </span>
              )}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Ventas realizadas</div>
            <div className="kpi-value-row">
              <div className="kpi-value">{ventasRealizadas}</div>
              {ventasRealizadasMeta != null && (
                <span
                  className={`kpi-chip ${
                    ventasRealizadasMeta &&
                    ventasRealizadas / (ventasRealizadasMeta || 1) >= 1
                      ? "ok"
                      : "warn"
                  }`}
                >
                  meta {ventasRealizadasMeta}
                </span>
              )}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Tiempo promedio de llamada</div>
            <div className="kpi-value-row">
              <div className="kpi-value">{fmtSecs(tpl)}</div>
              {tplMeta != null && (
                <span className="kpi-chip">meta {fmtSecs(tplMeta)}</span>
              )}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Llamadas por hora</div>
            <div className="kpi-value-row">
              <div className="kpi-value">{lxh}</div>
              {lxhMeta != null && (
                <span
                  className={`kpi-chip ${
                    lxhMeta && lxh / (lxhMeta || 1) >= 1 ? "ok" : "warn"
                  }`}
                >
                  meta {lxhMeta}
                </span>
              )}
            </div>
          </div>

          <div className="kpi-card kpi-highlight">
            <div className="kpi-label">Cumplimiento</div>
            <div className="kpi-value-row">
              <div className="kpi-value">{fmtPct(cumplimiento)}</div>
              {cumplimientoMeta != null && (
                <span className="kpi-chip">meta {fmtPct(cumplimientoMeta)}</span>
              )}
            </div>
          </div>
        </div>

        {}
        <div className="kpi-charts">
          <div className="chart-card">
            <div className="chart-title">Llamadas por hora</div>
            <div className="chart-body">
              {loading ? (
                <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
                  <CircularProgress />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seriesHora}>
                    <XAxis dataKey="hora" />
                    <YAxis />
                    <Tooltip />
                    {}
                    <Bar dataKey="valor" fill="currentColor" className="kpi-bars" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="chart-card" style={{ position: "relative" }}>
            <div className="chart-title">Cumplimiento de objetivos</div>
            <div className="chart-body" style={{ position: "relative" }}>
              {loading ? (
                <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
                  <CircularProgress />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100}>
                      {donutData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={DONUT_COLORS[i] || DONUT_COLORS[0]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {}
              {!loading && (
                <div className="donut-center">
                  <div>{fmtPct(cumplimiento)}</div>
                  <small>meta {fmtPct(cumplimientoMeta ?? 1)}</small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
