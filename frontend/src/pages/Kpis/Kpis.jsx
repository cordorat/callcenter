import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { getKpiOverview } from "@/core/api/kpis";
import RefreshIcon from '@mui/icons-material/Refresh';
import LoopIcon from '@mui/icons-material/Loop';

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

// Función helper para convertir Date a formato YYYY-MM-DD en zona horaria local
const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayRange = () => {
  const d = new Date();
  const iso = toLocalDateString(d);
  return { from: iso, to: iso };
};

const weekRange = () => {
  const d = new Date();
  const dayOfWeek = d.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  
  // Calcular el lunes de la semana actual
  const monday = new Date(d);
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si es domingo, retroceder 6 días
  monday.setDate(d.getDate() - daysFromMonday);
  
  // Calcular el sábado de la semana actual (lunes + 5 días)
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

  // Calcular cumplimiento real basado en ventas vs meta de ventas
  const cumplimientoReal = ventasRealizadasMeta > 0 
    ? Math.min(ventasRealizadas / ventasRealizadasMeta, 1) 
    : 0;

  const seriesHora = data?.series?.llamadas_por_hora || [];
  
  // Calcular promedio de llamadas por hora para el tooltip
  const llamadasPorHoraPromedio = React.useMemo(() => {
    if (seriesHora.length === 0) return 0;
    const total = seriesHora.reduce((sum, item) => sum + (item.valor || 0), 0);
    return total / seriesHora.length;
  }, [seriesHora]);
  const donutData = React.useMemo(
    () => [
      { name: "Completado", value: Math.max(0, Math.min(cumplimientoReal, 1)), ventas: ventasRealizadas },
      { name: "Pendiente", value: Math.max(0, 1 - Math.max(0, Math.min(cumplimientoReal, 1))), faltante: Math.max(0, ventasRealizadasMeta - ventasRealizadas) },
    ],
    [cumplimientoReal, ventasRealizadas, ventasRealizadasMeta]
  );

  // Tooltip personalizado para la gráfica circular
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const porcentaje = (payload[0].value * 100).toFixed(1);
      
      if (data.name === "Completado") {
        return (
          <div style={{ 
            background: '#fff', 
            padding: '8px 12px', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#2f76e6' }}>
              {data.name}: {porcentaje}%
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
              {data.ventas} ventas realizadas
            </p>
          </div>
        );
      } else {
        return (
          <div style={{ 
            background: '#fff', 
            padding: '8px 12px', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#9ec9ff' }}>
              {data.name}: {porcentaje}%
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
              {data.faltante} ventas faltantes
            </p>
          </div>
        );
      }
    }
    return null;
  };

  // Tooltip personalizado para gráfica de barras
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.valor || 0;
      const promedio = Math.round(llamadasPorHoraPromedio);
      const diferencia = total - promedio;
      const porcentajeVsPromedio = promedio > 0 ? ((total / promedio) * 100).toFixed(0) : 0;
      
      return (
        <div style={{ 
          background: '#fff', 
          padding: '10px 14px', 
          border: '2px solid #2f76e6', 
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: '160px'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#132051', fontSize: '14px' }}>
            {data.hora}
          </p>
          <p style={{ margin: '8px 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#2f76e6' }}>
            {total} llamada(s)
          </p>
          <div style={{ 
            marginTop: '8px', 
            paddingTop: '8px', 
            borderTop: '1px solid #e0e0e0',
            fontSize: '12px',
            color: '#4a5a82'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Promedio:</span>
              <span style={{ fontWeight: '600' }}>{promedio} llamadas/hora</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Diferencia:</span>
              <span style={{ 
                fontWeight: '700',
                color: diferencia >= 0 ? '#0a6b2b' : '#c41e3a',
                fontSize: '13px'
              }}>
                {diferencia >= 0 ? '+' : ''}{diferencia} ({porcentajeVsPromedio}%)
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <MainLayout title="KPIs">
      <div className="kpi-page">
        {/* Header */}
        <div className="kpi-header">
          <h2></h2>
          <div className="kpi-actions">
            {updatedAt && (
              <span className="update-badge">
                Última actualización: {new Date(updatedAt).toLocaleString()}
              </span>
            )}
            <button className="btn" onClick={fetchData} disabled={loading}>
              {loading ? <RefreshIcon fontSize="small" className="spinning" /> : <RefreshIcon fontSize="small" />}
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
              <div className="kpi-value">{fmtPct(cumplimientoReal)}</div>
              <span className="kpi-chip" style={{ fontSize: '10px', padding: '3px 6px' }}>
                {ventasRealizadas} de {ventasRealizadasMeta} ventas
              </span>
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
                  <BarChart 
                    data={seriesHora}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2f76e6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#5a96ff" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="hora" 
                      tick={{ fill: '#4a5a82', fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: '#cad4dd', strokeWidth: 1.5 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#4a5a82', fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: '#cad4dd', strokeWidth: 1.5 }}
                      tickLine={false}
                      label={{ 
                        value: 'Llamadas', 
                        angle: -90, 
                        position: 'insideLeft',
                        offset: 15,
                        style: { 
                          fill: '#4a5a82', 
                          fontWeight: 600,
                          fontSize: 13,
                          textAnchor: 'middle'
                        } 
                      }}
                    />
                    <Tooltip 
                      content={<CustomBarTooltip />} 
                      cursor={{ fill: 'rgba(47, 118, 230, 0.1)' }}
                      animationDuration={0}
                      isAnimationActive={false}
                    />
                    <Bar 
                      dataKey="valor" 
                      fill="url(#barGradient)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={50}
                      animationDuration={800}
                    />
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
                    <defs>
                      <linearGradient id="completadoGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#0a6b2b" stopOpacity={1} />
                        <stop offset="100%" stopColor="#0f8d3a" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="pendienteGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#e0e0e0" stopOpacity={1} />
                        <stop offset="100%" stopColor="#f5f5f5" stopOpacity={1} />
                      </linearGradient>
                      <filter id="donutShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
                      </filter>
                    </defs>
                    <Pie 
                      data={donutData} 
                      dataKey="value" 
                      nameKey="name" 
                      innerRadius={70} 
                      outerRadius={100}
                      paddingAngle={2}
                      animationDuration={1000}
                      animationBegin={0}
                      stroke="#ffffff"
                      strokeWidth={3}
                      filter="url(#donutShadow)"
                    >
                      {donutData.map((entry, i) => (
                        <Cell 
                          key={`cell-${i}`} 
                          fill={i === 0 ? "url(#completadoGradient)" : "url(#pendienteGradient)"} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={<CustomTooltip />}
                      animationDuration={0}
                      isAnimationActive={false}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {}
              {!loading && (
                <div className="donut-center">
                  <div>{fmtPct(cumplimientoReal)}</div>
                  <small>{ventasRealizadas} de {ventasRealizadasMeta} ventas</small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
