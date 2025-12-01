import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { getKpiOverview } from "@/core/api/kpis";
import RefreshIcon from '@mui/icons-material/Refresh';
import LoopIcon from '@mui/icons-material/Loop';
import { useTheme } from '@mui/material/styles';
import { IconButton, Tooltip as MuiTooltip, TextField, Stack } from '@mui/material';
import { getDateInputSx, getDateInputLabelProps } from '@/core/styles/dateInputStyles';

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
  const n = Math.round(Number(s || 0)); // Redondear primero
  const m = Math.floor(n / 60);
  const ss = n % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")} min`;
};
const fmtPct = (x) => `${Math.round(Number(x || 0) * 100)}%`;

const DONUT_COLORS = ["#2f76e6", "#9ec9ff"];

export default function Kpis() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
            background: theme.palette.background.paper, 
            padding: '8px 12px', 
            border: `1px solid ${theme.palette.divider}`, 
            borderRadius: '4px',
            boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#2f76e6' }}>
              {data.name}: {porcentaje}%
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: theme.palette.text.secondary }}>
              {data.ventas} ventas realizadas
            </p>
          </div>
        );
      } else {
        return (
          <div style={{ 
            background: theme.palette.background.paper, 
            padding: '8px 12px', 
            border: `1px solid ${theme.palette.divider}`, 
            borderRadius: '4px',
            boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#9ec9ff' }}>
              {data.name}: {porcentaje}%
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: theme.palette.text.secondary }}>
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
          background: theme.palette.background.paper, 
          padding: '10px 14px', 
          border: `2px solid ${theme.palette.primary.main}`, 
          borderRadius: '8px',
          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: '160px'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: theme.palette.text.primary, fontSize: '14px' }}>
            {data.hora}
          </p>
          <p style={{ margin: '8px 0 4px 0', fontSize: '20px', fontWeight: '800', color: theme.palette.primary.main }}>
            {total} llamada(s)
          </p>
          <div style={{ 
            marginTop: '8px', 
            paddingTop: '8px', 
            borderTop: `1px solid ${theme.palette.divider}`,
            fontSize: '12px',
            color: theme.palette.text.secondary
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
      <div 
        className="kpi-page"
        style={{
          '--text-primary': theme.palette.text.primary,
          '--text-secondary': theme.palette.text.secondary,
          '--background-paper': theme.palette.background.paper,
          '--primary-main': theme.palette.primary.main,
          '--primary-dark': isDark ? theme.palette.primary.dark : '#1a2b7a',
          '--appbar-default': theme.palette.appBar.default,
          '--campaign-filter-bg': isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFB',
          '--kpi-highlight-bg': isDark 
            ? 'linear-gradient(135deg, #1E2A3F 0%, #2A3B5C 100%)' 
            : 'linear-gradient(135deg, #EFF6FB 0%, #E0EDF9 100%)',
          '--donut-gradient': isDark
            ? 'linear-gradient(135deg, #4A8FE7 0%, #6BA8FF 100%)'
            : 'linear-gradient(135deg, #132051 0%, #2f76e6 100%)',
          // Variables para el segmented control (Día/Semana/Mes)
          '--segmented-bg': isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0F4F8',
          '--segmented-border': isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(12, 21, 90, 0.12)',
          '--segmented-hover': isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(12, 21, 90, 0.05)',
          '--segmented-active-shadow': isDark 
            ? '0 2px 8px rgba(74, 143, 231, 0.3)' 
            : '0 2px 4px rgba(12, 21, 90, 0.2)',
          // Variables para los inputs de fecha
          '--date-bg': isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0F4F8',
          '--date-border': isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(12, 21, 90, 0.15)',
          '--date-focus-shadow': isDark 
            ? '0 0 0 3px rgba(74, 143, 231, 0.2)' 
            : '0 0 0 3px rgba(12, 21, 90, 0.1)',
          '--date-icon-filter': isDark ? 'invert(1) brightness(1.2)' : 'none',
        }}
      >
        {/* Header */}
        <div className="kpi-header">
          <h2></h2>
          <div className="kpi-actions">
            {updatedAt && (
              <span className="update-badge">
                Última actualización: {new Date(updatedAt).toLocaleString()}
              </span>
            )}
            <MuiTooltip title="Actualizar">
              <span>
                <IconButton
                  onClick={fetchData}
                  disabled={loading}
                  aria-label="Actualizar"
                  size="large"
                  sx={{
                    backgroundColor: theme.palette.primary.main,
                    color: "#fff",
                    transition: "all 0.3s ease",
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                      transform: "rotate(180deg)",
                    },
                    '&.Mui-disabled': {
                      backgroundColor: theme.palette.action.disabled,
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
              </span>
            </MuiTooltip>
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

          <Stack direction="row" spacing={1}>
            <TextField
              label="Desde"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setMode("custom");
              }}
              InputLabelProps={getDateInputLabelProps(theme)}
              sx={getDateInputSx(theme)}
            />
            <TextField
              label="Hasta"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setMode("custom");
              }}
              InputLabelProps={getDateInputLabelProps(theme)}
              sx={getDateInputSx(theme)}
            />
          </Stack>
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
                        {isDark ? (
                          <>
                            <stop offset="0%" stopColor="#4A8FE7" stopOpacity={1} />
                            <stop offset="100%" stopColor="#2f76e6" stopOpacity={0.9} />
                          </>
                        ) : (
                          <>
                            <stop offset="0%" stopColor="#2f76e6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#5a96ff" stopOpacity={0.9} />
                          </>
                        )}
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="hora" 
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
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
                      cursor={{ fill: isDark ? 'rgba(74, 143, 231, 0.1)' : 'rgba(47, 118, 230, 0.1)' }}
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
                      {/* Degradado de completado - Verde en light, Azul celeste en dark */}
                      <linearGradient id="completadoGradient" x1="0" y1="0" x2="1" y2="1">
                        {isDark ? (
                          <>
                            <stop offset="0%" stopColor="#4A8FE7" stopOpacity={1} />
                            <stop offset="100%" stopColor="#6BA8FF" stopOpacity={1} />
                          </>
                        ) : (
                          <>
                            <stop offset="0%" stopColor="#0a6b2b" stopOpacity={1} />
                            <stop offset="100%" stopColor="#0f8d3a" stopOpacity={1} />
                          </>
                        )}
                      </linearGradient>
                      {/* Degradado de pendiente */}
                      <linearGradient id="pendienteGradient" x1="0" y1="0" x2="1" y2="1">
                        {isDark ? (
                          <>
                            <stop offset="0%" stopColor="#2A3B5C" stopOpacity={1} />
                            <stop offset="100%" stopColor="#3D5270" stopOpacity={1} />
                          </>
                        ) : (
                          <>
                            <stop offset="0%" stopColor="#e0e0e0" stopOpacity={1} />
                            <stop offset="100%" stopColor="#f5f5f5" stopOpacity={1} />
                          </>
                        )}
                      </linearGradient>
                      <filter id="donutShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity={isDark ? "0.3" : "0.15"}/>
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
