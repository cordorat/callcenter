// PATH: src/pages/Kpis/KpisCoordinador.jsx
import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { getCoordinadorKpiOverview, exportarCoordinadorKpisPDF } from "@/core/api/kpis";
import { useNavigate } from "react-router-dom";
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useTheme } from '@mui/material/styles';
import ButtonTooltip from "@/components/campaing/ButtonTooltip";

import "./Kpis.css";

import {
    CircularProgress,
    Alert,
    Paper,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
    Stack,
    TextField,
} from "@mui/material";
import { getDateInputSx, getDateInputLabelProps } from '@/core/styles/dateInputStyles';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
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
    const n = Math.round(Number(s || 0)); // Redondear primero
    const m = Math.floor(n / 60);
    const ss = n % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")} min`;
};

const ESTADO_COLORS = {
    DISPONIBLE: '#4caf50',
    EN_LLAMADA: '#2196f3',
    AFTERCALL: '#00acc1',
    EN_DESCANSO: '#ff9800',
    NO_DISPONIBLE: '#f44336',
    ALMUERZO: '#9c27b0',
    CAPACITACION: '#00bcd4',
    REUNION: '#3f51b5',
    SIN_ESTADO: '#9e9e9e',
};

export default function KpisCoordinador() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();

    // Estado de filtros de fecha
    const [mode, setMode] = React.useState("day"); // day|week|month|custom
    const [from, setFrom] = React.useState(todayRange().from);
    const [to, setTo] = React.useState(todayRange().to);

    // Estado de datos
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [errMsg, setErrMsg] = React.useState("");
    const [updatedAt, setUpdatedAt] = React.useState(null);

    // Estado para exportación
    const [exportando, setExportando] = React.useState(false);

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
        setLoading(true);
        setErrMsg("");
        try {
            const resp = await getCoordinadorKpiOverview({
                fecha_desde: from,
                fecha_hasta: to,
            });
            setData(resp || null);
            setUpdatedAt(resp?.fecha_consulta || new Date().toISOString());
        } catch (e) {
            console.error(e);
            setErrMsg("No se pudieron cargar los KPIs. Intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    // Cargar datos cuando cambien las fechas
    React.useEffect(() => {
        fetchData();
    }, [from, to]);

    // Auto-refresh cada 5 minutos (300000 ms)
    React.useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
        }, 300000); // 5 minutos

        return () => clearInterval(interval);
    }, [from, to]);

    // Función para exportar KPIs a PDF
    const handleExportarPDF = async () => {
        setExportando(true);
        try {
            const response = await exportarCoordinadorKpisPDF({
                fecha_desde: from,
                fecha_hasta: to,
            });

            // Crear un blob y descargar el archivo
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `KPIs_Equipo_${from}_${to}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (e) {
            console.error(e);
            setErrMsg("No se pudieron exportar los KPIs. Intenta nuevamente.");
        } finally {
            setExportando(false);
        }
    };

    // Extraer datos
    const llamadasActivas = Number(data?.llamadas_activas || 0);
    const estadosEquipo = data?.estados_equipo || {};
    const tiempoPromedioLlamada = Number(data?.tiempo_promedio_llamada || 0);
    const llamadasDelPeriodo = Number(data?.llamadas_del_periodo || 0);
    const ventasRealizadas = Number(data?.ventas_realizadas || 0);
    const tasaConversion = Number(data?.tasa_conversion || 0);
    const rankingAgentes = data?.ranking_agentes || [];
    const totalAgentes = Number(data?.total_agentes || 0);

    // Preparar datos para gráfica de estados (pie chart)
    const estadosData = React.useMemo(() => {
        return Object.entries(estadosEquipo).map(([estado, cantidad]) => ({
            name: estado.replace(/_/g, ' '),
            value: cantidad,
            estado: estado,
        }));
    }, [estadosEquipo]);

    return (
        <MainLayout title="KPIs del Equipo">
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
                    <h2>KPIs del Equipo</h2>
                    <div className="kpi-actions">
                        {updatedAt && (
                            <span className="update-badge">
                                Última actualización: {new Date(updatedAt).toLocaleString()}
                            </span>
                        )}
                        <Stack direction="row" spacing={1}>
                            <Tooltip title="Actualizar">
                                <IconButton
                                    onClick={fetchData}
                                    disabled={loading}
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
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                            {!exportando ? (
                                <Tooltip title="Exportar KPI a PDF">
                                    <IconButton
                                        onClick={handleExportarPDF}
                                        disabled={loading}
                                        size="large"
                                        sx={{
                                            backgroundColor: theme.palette.error.main,
                                            color: "#fff",
                                            transition: "all 0.3s ease",
                                            '&:hover': {
                                                backgroundColor: theme.palette.error.dark,
                                                transform: "scale(1.05)",
                                            },
                                            '&.Mui-disabled': {
                                                backgroundColor: theme.palette.action.disabled,
                                                color: "rgba(255, 255, 255, 0.5)",
                                            },
                                        }}
                                    >
                                        <PictureAsPdfIcon />
                                    </IconButton>
                                </Tooltip>
                            ) : (
                                <Tooltip title="Exportando...">
                                    <IconButton
                                        disabled
                                        size="large"
                                        sx={{
                                            backgroundColor: theme.palette.error.main,
                                            color: "#fff",
                                            '&.Mui-disabled': {
                                                backgroundColor: theme.palette.action.disabled,
                                                color: "rgba(255, 255, 255, 0.5)",
                                            },
                                        }}
                                    >
                                        <CircularProgress size={24} sx={{ color: 'white' }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>
                    </div>
                </div>

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

                    <Stack direction="row" spacing={1}>
                        <TextField
                            label="Desde"
                            type="date"
                            value={from}
                            max={toLocalDateString(new Date())}
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
                            max={toLocalDateString(new Date())}
                            min={from}
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
                        <div className="kpi-label">Llamadas activas</div>
                        <div className="kpi-value-row">
                            <div className="kpi-value">{llamadasActivas}</div>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-label">Total agentes</div>
                        <div className="kpi-value-row">
                            <div className="kpi-value">{totalAgentes}</div>
                            <span className="kpi-chip">{Object.values(estadosEquipo).reduce((a, b) => a + b, 0)} activos</span>
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
                            <div className="kpi-value">{llamadasDelPeriodo}</div>
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

                {/* Gráficas y Tablas */}
                <div className="kpi-charts">
                    {/* Gráfica de estados del equipo */}
                    <div className="chart-card">
                        <div className="chart-title">Desglose de Estados del Equipo</div>
                        <div className="chart-body">
                            {loading ? (
                                <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
                                    <CircularProgress />
                                </div>
                            ) : estadosData.length === 0 ? (
                                <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
                                    <Typography color="text.secondary">No hay datos disponibles</Typography>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={estadosData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            paddingAngle={2}
                                            animationDuration={1000}
                                            stroke="#ffffff"
                                            strokeWidth={2}
                                        >
                                            {estadosData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={ESTADO_COLORS[entry.estado] || '#9e9e9e'}
                                                />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Ranking de agentes */}
                    <div className="chart-card">
                        <div className="chart-title">Ranking de Agentes por Ventas</div>
                        <div className="chart-body" style={{ overflow: 'auto', padding: '16px' }}>
                            {loading ? (
                                <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
                                    <CircularProgress />
                                </div>
                            ) : rankingAgentes.length === 0 ? (
                                <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
                                    <Typography color="text.secondary">No hay ventas en el período seleccionado</Typography>
                                </div>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>#</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Agente</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary' }}>Ventas</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Acción</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rankingAgentes.map((agente, index) => (
                                                <TableRow
                                                    key={agente.agente_id}
                                                    sx={{
                                                        '&:hover': { backgroundColor: 'action.hover' },
                                                        backgroundColor: index < 3 ? (isDark ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)') : 'transparent',
                                                    }}
                                                >
                                                    <TableCell>
                                                        <Box
                                                            sx={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: '50%',
                                                                backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'transparent',
                                                                color: index < 3 ? '#000' : 'text.secondary',
                                                                fontWeight: 700,
                                                                fontSize: '0.875rem',
                                                            }}
                                                        >
                                                            {index + 1}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'text.primary' }}>{agente.agente_nombre}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                                        {agente.ventas}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Tooltip title="Ver detalles" arrow>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => navigate(`/kpis/agentes/${agente.agente_id}`)}
                                                                sx={{
                                                                  bgcolor: 'action.hover',
                                                                  '&:hover': {
                                                                    bgcolor: 'primary.main',
                                                                    color: 'white',
                                                                  },
                                                                  transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <PersonIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Botón para ver todos los agentes */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Paper
                        elevation={1}
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1.5,
                            px: 2.5,
                            py: 1.25,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            backgroundColor: 'background.paper',
                            borderRadius: 2,
                            border: `1px solid ${isDark ? 'rgba(47, 118, 230, 0.3)' : 'rgba(47, 118, 230, 0.2)'}`,
                            '&:hover': {
                                borderColor: 'primary.main',
                                backgroundColor: isDark ? 'rgba(47, 118, 230, 0.08)' : 'rgba(47, 118, 230, 0.05)',
                                transform: 'translateY(-1px)',
                                boxShadow: 3,
                            }
                        }}
                        onClick={() => navigate('/kpis/agentes')}
                    >
                        <PeopleIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                        <Typography variant="body1" fontWeight={600} sx={{ color: 'text.primary' }}>
                            Ver Todos los Agentes
                        </Typography>
                    </Paper>
                </Box>
            </div>
        </MainLayout>
    );
}
