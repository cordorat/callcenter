// PATH: src/pages/Kpis/KpisJefeCampana.jsx
import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { getCampanaKpiOverview } from "@/core/api/kpis";
import { historialJefeService } from "@/core/api/historialJefeCampana";
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTheme } from '@mui/material/styles';

import "./Kpis.css";

import {
    CircularProgress,
    Alert,
    Paper,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Stack,
} from "@mui/material";

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
    const dayOfWeek = d.getDay();
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

const fmtSecs = (s) => {
    const n = Number(s || 0);
    const m = Math.floor(n / 60);
    const ss = n % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")} min`;
};

export default function KpisJefeCampana() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    // Estado de campañas
    const [campanas, setCampanas] = React.useState([]);
    const [campanaSeleccionada, setCampanaSeleccionada] = React.useState("");
    const [loadingCampanas, setLoadingCampanas] = React.useState(true);

    // Estado de filtros de fecha
    const [mode, setMode] = React.useState("day"); // day|week|month|custom
    const [from, setFrom] = React.useState(todayRange().from);
    const [to, setTo] = React.useState(todayRange().to);

    // Estado de datos
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [errMsg, setErrMsg] = React.useState("");
    const [updatedAt, setUpdatedAt] = React.useState(null);

    // Cargar campañas al montar
    React.useEffect(() => {
        const cargarCampanas = async () => {
            try {
                setLoadingCampanas(true);
                const response = await historialJefeService.getMisCampanas();
                const campanasData = response.campanas || [];
                setCampanas(campanasData);

                // Si solo tiene una campaña, seleccionarla automáticamente
                if (campanasData.length === 1) {
                    setCampanaSeleccionada(campanasData[0].id);
                }
            } catch (error) {
                console.error("Error al cargar campañas:", error);
                setErrMsg("Error al cargar campañas. Intenta recargar la página.");
            } finally {
                setLoadingCampanas(false);
            }
        };

        cargarCampanas();
    }, []);

    // Actualizar rango de fechas según modo
    React.useEffect(() => {
        let r = todayRange();
        if (mode === "week") r = weekRange();
        if (mode === "month") r = monthRange();
        if (mode !== "custom") {
            setFrom(r.from);
            setTo(r.to);
        }
    }, [mode]);

    // Fetch KPIs
    const fetchData = async () => {
        // Si tiene múltiples campañas y no ha seleccionado una, no hacer nada
        if (campanas.length > 1 && !campanaSeleccionada) {
            return;
        }

        setLoading(true);
        setErrMsg("");
        try {
            const params = {
                fecha_desde: from,
                fecha_hasta: to,
            };

            // Solo enviar campana_id si está seleccionada
            if (campanaSeleccionada) {
                params.campana_id = campanaSeleccionada;
            }

            const resp = await getCampanaKpiOverview(params);
            setData(resp || null);
            setUpdatedAt(resp?.fecha_consulta || new Date().toISOString());
        } catch (e) {
            console.error(e);
            setErrMsg("No se pudieron cargar los KPIs. Intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    // Cargar datos cuando cambien las fechas o campaña seleccionada
    React.useEffect(() => {
        if (!loadingCampanas && (campanaSeleccionada || campanas.length === 1)) {
            fetchData();
        }
    }, [from, to, campanaSeleccionada, loadingCampanas]);

    // Renderizar selector de campaña
    const renderSelectorCampana = () => {
        if (loadingCampanas) {
            return (
                <Paper elevation={2} sx={{ p: 2, mb: 2, textAlign: 'center' }}>
                    <CircularProgress size={24} />
                    <Typography sx={{ mt: 1 }}>Cargando campañas...</Typography>
                </Paper>
            );
        }

        if (campanas.length === 0) {
            return (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    No hay campañas asignadas en el momento.
                </Alert>
            );
        }

        // Si solo tiene una campaña, mostrar info
        if (campanas.length === 1) {
            const campana = campanas[0];
            return (
                <Paper elevation={2} sx={{ p: 2, mb: 2, width: 'fit-content' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="h6" fontWeight={700}>
                            {campana.nombre}
                        </Typography>
                        {campana.estado && (
                            <Chip
                                label={campana.estado}
                                size="small"
                                color={campana.estado === 'ACTIVA' ? 'success' : campana.estado === 'PAUSADA' ? 'warning' : 'default'}
                                sx={{ fontWeight: 600 }}
                            />
                        )}
                    </Stack>
                </Paper>
            );
        }

        // Si tiene múltiples campañas, mostrar selector
        return (
            <Paper elevation={2} sx={{ p: 2, mb: 2, width: 'fit-content', minWidth: 400 }}>
                <FormControl fullWidth>
                    <InputLabel id="campana-label">Selecciona una campaña</InputLabel>
                    <Select
                        labelId="campana-label"
                        value={campanaSeleccionada}
                        label="Selecciona una campaña"
                        onChange={(e) => setCampanaSeleccionada(e.target.value)}
                    >
                        <MenuItem value="" disabled>
                            -- Selecciona una campaña --
                        </MenuItem>
                        {campanas.map((camp) => (
                            <MenuItem key={camp.id} value={camp.id}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                                    <Typography sx={{ flex: 1 }}>{camp.nombre}</Typography>
                                    {camp.estado && (
                                        <Chip
                                            label={camp.estado}
                                            size="small"
                                            color={camp.estado === 'ACTIVA' ? 'success' : camp.estado === 'PAUSADA' ? 'warning' : 'default'}
                                            sx={{
                                                height: 20,
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                            }}
                                        />
                                    )}
                                </Stack>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Paper>
        );
    };

    // Extraer datos
    const llamadasActivas = Number(data?.llamadas_activas || 0);
    const agentesDisponibles = Number(data?.agentes_disponibles || 0);
    const tiempoPromedioLlamada = Number(data?.tiempo_promedio_llamada || 0);
    const llamadasDelDia = Number(data?.llamadas_del_dia || 0);
    const ventasRealizadas = Number(data?.ventas_realizadas || 0);
    const tasaConversion = Number(data?.tasa_conversion || 0);
    const totalAgentes = Number(data?.total_agentes || 0);

    return (
        <MainLayout title="KPIs de Campaña">
            <div
                className="kpi-page"
                style={{
                    '--text-primary': theme.palette.text.primary,
                    '--text-secondary': theme.palette.text.secondary,
                    '--background-paper': theme.palette.background.paper,
                    '--primary-main': theme.palette.primary.main,
                    '--primary-dark': isDark ? theme.palette.primary.dark : '#1a2b7a',
                    '--segmented-bg': isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0F4F8',
                    '--segmented-border': isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(12, 21, 90, 0.12)',
                    '--segmented-hover': isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(12, 21, 90, 0.05)',
                    '--date-bg': isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0F4F8',
                    '--date-border': isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(12, 21, 90, 0.15)',
                    '--kpi-highlight-bg': isDark
                        ? 'linear-gradient(135deg, rgba(47, 118, 230, 0.15) 0%, rgba(47, 118, 230, 0.08) 100%)'
                        : 'linear-gradient(135deg, #EFF6FB 0%, #E0EDF9 100%)',
                }}
            >
                {/* Header */}
                <div className="kpi-header">
                    <h2>KPIs de Campaña</h2>
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

                {/* Selector de Campaña */}
                {renderSelectorCampana()}

                {/* Mostrar filtros y KPIs solo si hay campaña seleccionada */}
                {(campanaSeleccionada || campanas.length === 1) && (
                    <>
                        {/* Filtros de fecha */}
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
                                <div className="kpi-label">Llamadas activas</div>
                                <div className="kpi-value-row">
                                    <div className="kpi-value">{llamadasActivas}</div>
                                </div>
                            </div>

                            <div className="kpi-card">
                                <div className="kpi-label">Agentes disponibles</div>
                                <div className="kpi-value-row">
                                    <div className="kpi-value">{agentesDisponibles}</div>
                                    <span className="kpi-chip">de {totalAgentes}</span>
                                </div>
                            </div>

                            <div className="kpi-card">
                                <div className="kpi-label">Tiempo promedio de llamada</div>
                                <div className="kpi-value-row">
                                    <div className="kpi-value">{fmtSecs(tiempoPromedioLlamada)}</div>
                                </div>
                            </div>

                            <div className="kpi-card">
                                <div className="kpi-label">Llamadas del período</div>
                                <div className="kpi-value-row">
                                    <div className="kpi-value">{llamadasDelDia}</div>
                                </div>
                            </div>

                            <div className="kpi-card">
                                <div className="kpi-label">Ventas realizadas</div>
                                <div className="kpi-value-row">
                                    <div className="kpi-value">{ventasRealizadas}</div>
                                </div>
                            </div>

                            <div className="kpi-card kpi-highlight">
                                <div className="kpi-label">Tasa de conversión</div>
                                <div className="kpi-value-row">
                                    <div className="kpi-value">{tasaConversion.toFixed(1)}%</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </MainLayout>
    );
}
