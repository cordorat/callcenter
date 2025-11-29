// PATH: src/pages/Kpis/KpisJefeCentro.jsx

import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { 
    getJefeCentroCampanasKpi, 
    getEquiposJefeCentro, 
    getEquipoKpiDetalleJefeCentro,
    exportarJefeCentroKpisPDF
} from "@/core/api/kpis";
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme } from '@mui/material/styles';
import CampaignIcon from '@mui/icons-material/Campaign';
import ButtonTooltip from "@/components/campaing/ButtonTooltip";
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import BarChartIcon from '@mui/icons-material/BarChart';

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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Box,
    IconButton,
    Button,
    Pagination,
    TextField,
    InputAdornment,
    Tooltip
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
    const n = Math.round(Number(s || 0)); // Redondear primero
    const m = Math.floor(n / 60);
    const ss = n % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")} min`;
};

export default function KpisJefeCentro() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    // Estado de pestañas
    const [tabValue, setTabValue] = React.useState(0); // 0 = Campaña, 1 = Equipos

    // Estado de filtros de fecha
    const [mode, setMode] = React.useState("day"); // day|week|month|custom
    const [from, setFrom] = React.useState(todayRange().from);
    const [to, setTo] = React.useState(todayRange().to);

    // Estado de filtro por campaña (solo para pestaña Campaña)
    const [campanaSeleccionada, setCampanaSeleccionada] = React.useState("");

    // Estado de datos de campaña
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [errMsg, setErrMsg] = React.useState("");
    const [updatedAt, setUpdatedAt] = React.useState(null);
    
    // Lista completa de campañas para el filtro
    const [campanasCompletas, setCampanasCompletas] = React.useState([]);

    // Estado de equipos
    const [equipos, setEquipos] = React.useState([]);
    const [loadingEquipos, setLoadingEquipos] = React.useState(false);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [totalEquipos, setTotalEquipos] = React.useState(0);
    
    // Estado de paginación de campañas
    const [pageCampanas, setPageCampanas] = React.useState(0);
    const [rowsPerPageCampanas, setRowsPerPageCampanas] = React.useState(10);
    
    // Estado de detalle de equipo
    const [equipoSeleccionado, setEquipoSeleccionado] = React.useState(null);
    const [dataEquipo, setDataEquipo] = React.useState(null);
    const [loadingEquipoDetalle, setLoadingEquipoDetalle] = React.useState(false);
    
    // Estado para exportación
    const [exportando, setExportando] = React.useState(false);
    
    // Estados de búsqueda
    const [searchEquipos, setSearchEquipos] = React.useState('');
    const [searchCampanas, setSearchCampanas] = React.useState('');

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

    // Cargar lista completa de campañas (sin filtrar) al montar
    React.useEffect(() => {
        const fetchCampanasCompletas = async () => {
            try {
                const resp = await getJefeCentroCampanasKpi({
                    fecha_desde: from,
                    fecha_hasta: to,
                });
                if (resp?.campanas) {
                    setCampanasCompletas(resp.campanas);
                }
            } catch (e) {
                console.error("Error cargando lista de campañas:", e);
            }
        };

        fetchCampanasCompletas();
    }, []);

    // Fetch KPIs de campaña
    const fetchData = async () => {
        setLoading(true);
        setErrMsg("");
        try {
            const params = {
                fecha_desde: from,
                fecha_hasta: to,
            };

            // Agregar filtro por campaña si está seleccionada
            if (campanaSeleccionada) {
                params.campana_id = campanaSeleccionada;
            }

            const resp = await getJefeCentroCampanasKpi(params);
            setData(resp || null);
            setUpdatedAt(resp?.fecha_consulta || new Date().toISOString());
            
            // Si no hay filtro seleccionado, actualizar la lista completa también
            if (!campanaSeleccionada && resp?.campanas) {
                setCampanasCompletas(resp.campanas);
            }
        } catch (e) {
            console.error(e);
            setErrMsg("No se pudieron cargar los KPIs. Intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    // Cargar datos cuando cambien las fechas o campaña seleccionada
    React.useEffect(() => {
        if (tabValue === 0) {
            fetchData();
        } else {
            fetchEquipos();
        }
    }, [from, to, campanaSeleccionada, tabValue]);

    // Fetch lista de equipos (TODOS los equipos del centro, sin filtrar por campaña)
    const fetchEquipos = async () => {
        setLoadingEquipos(true);
        setErrMsg("");
        try {
            const resp = await getEquiposJefeCentro({
                page: page + 1,
                page_size: rowsPerPage
            });
            setEquipos(resp.results || []);
            setTotalEquipos(resp.count || 0);
            setUpdatedAt(new Date().toISOString());
        } catch (e) {
            console.error(e);
            setErrMsg("No se pudieron cargar los equipos. Intenta nuevamente.");
        } finally {
            setLoadingEquipos(false);
        }
    };

    // Fetch KPIs de equipo específico
    const fetchEquipoDetalle = async (equipo) => {
        setEquipoSeleccionado(equipo);
        setLoadingEquipoDetalle(true);
        setErrMsg("");
        try {
            const resp = await getEquipoKpiDetalleJefeCentro(equipo.equipo_id, {
                fecha_desde: from,
                fecha_hasta: to,
            });
            setDataEquipo(resp || null);
            setUpdatedAt(new Date().toISOString());
        } catch (e) {
            console.error(e);
            setErrMsg("No se pudieron cargar los KPIs del equipo. Intenta nuevamente.");
        } finally {
            setLoadingEquipoDetalle(false);
        }
    };

    // Volver a la lista de equipos
    const handleVolverALista = () => {
        setEquipoSeleccionado(null);
        setDataEquipo(null);
    };

    // Cambiar pestaña
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setErrMsg("");
        
        // Resetear estado de equipo seleccionado al cambiar de pestaña
        if (newValue === 0) {
            setEquipoSeleccionado(null);
            setDataEquipo(null);
        }
    };

    // Manejar cambio de página en tabla de equipos
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    // Manejar cambio de filas por página
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Manejar cambio de página en tabla de campañas
    const handleChangePageCampanas = (event, newPage) => {
        setPageCampanas(newPage - 1);
    };

    // Handlers de búsqueda
    const handleSearchEquipos = (event) => {
        setSearchEquipos(event.target.value);
        setPage(0); // Resetear a primera página
    };

    const handleSearchCampanas = (event) => {
        setSearchCampanas(event.target.value);
        setPageCampanas(0); // Resetear a primera página
    };

    // Recargar equipos cuando cambia la paginación
    React.useEffect(() => {
        if (tabValue === 1 && !equipoSeleccionado) {
            fetchEquipos();
        }
    }, [page, rowsPerPage]);

    // Extraer datos de campaña
    const campanas = data?.campanas || [];
    const totalCampanasActivas = data?.total_campanas_activas || 0;
    const centroNombre = data?.centro_nombre || "";

    // Filtrar equipos por búsqueda
    const equiposFiltrados = React.useMemo(() => {
        if (!searchEquipos) return equipos;
        return equipos.filter(equipo =>
            equipo.nombre?.toLowerCase().includes(searchEquipos.toLowerCase()) ||
            equipo.coordinador_nombre?.toLowerCase().includes(searchEquipos.toLowerCase()) ||
            equipo.campana_nombre?.toLowerCase().includes(searchEquipos.toLowerCase())
        );
    }, [equipos, searchEquipos]);

    // Filtrar campañas por búsqueda
    const campanasFiltradas = React.useMemo(() => {
        if (!searchCampanas) return campanas;
        return campanas.filter(campana =>
            campana.campana_nombre?.toLowerCase().includes(searchCampanas.toLowerCase())
        );
    }, [campanas, searchCampanas]);

    // Lista de campañas para el filtro
    const campanasParaFiltro = React.useMemo(() => {
        return campanasCompletas.map(camp => ({
            id: camp.campana_id,
            nombre: camp.campana_nombre,
        }));
    }, [campanasCompletas]);

    // Calcular totales agregados de todas las campañas
    const totales = React.useMemo(() => {
        if (campanas.length === 0) {
            return {
                llamadas_activas: 0,
                tiempo_promedio_llamada: 0,
                llamadas_del_periodo: 0,
                ventas_realizadas: 0,
                tasa_conversion: 0,
            };
        }

        const totalesLlamadas = campanas.reduce((acc, camp) => acc + Number(camp.llamadas_del_periodo || 0), 0);
        const totalesVentas = campanas.reduce((acc, camp) => acc + Number(camp.ventas_realizadas || 0), 0);
        const totalesActivas = campanas.reduce((acc, camp) => acc + Number(camp.llamadas_activas || 0), 0);
        
        // Promedio ponderado del tiempo promedio de llamada
        const tiempoTotal = campanas.reduce((acc, camp) => {
            const tiempo = Number(camp.tiempo_promedio_llamada || 0);
            const llamadas = Number(camp.llamadas_del_periodo || 0);
            return acc + (tiempo * llamadas);
        }, 0);
        const tiempoPromedio = totalesLlamadas > 0 ? tiempoTotal / totalesLlamadas : 0;

        // Tasa de conversión global
        const tasaConversion = totalesLlamadas > 0 ? (totalesVentas / totalesLlamadas * 100) : 0;

        return {
            llamadas_activas: totalesActivas,
            tiempo_promedio_llamada: tiempoPromedio,
            llamadas_del_periodo: totalesLlamadas,
            ventas_realizadas: totalesVentas,
            tasa_conversion: tasaConversion,
        };
    }, [campanas]);
    // Función para exportar KPIs a PDF
    const handleExportarPDF = async () => {
        setExportando(true);
        try {
            const response = await exportarJefeCentroKpisPDF({
                campana_id: campanaSeleccionada || undefined,
                fecha_desde: from,
                fecha_hasta: to,
            });

            // Crear un blob y descargar el archivo
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `KPIs_Centro_${from}_${to}.pdf`;
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
    // Extraer datos de equipo
    const equipoLlamadasActivas = Number(dataEquipo?.llamadas_activas || 0);
    const equipoAgentesDisponibles = Number(dataEquipo?.agentes_disponibles || 0);
    const equipoTiempoPromedioLlamada = Number(dataEquipo?.tiempo_promedio_llamada || 0);
    const equipoLlamadasDelDia = Number(dataEquipo?.llamadas_del_dia || 0);
    const equipoVentasRealizadas = Number(dataEquipo?.ventas_realizadas || 0);
    const equipoTasaConversion = Number(dataEquipo?.tasa_conversion || 0);
    const equipoTotalAgentes = Number(dataEquipo?.total_agentes || 0);

    // Renderizar tabla de equipos
    const renderTablaEquipos = () => {
        if (loadingEquipos) {
            return (
                <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }}>Cargando equipos...</Typography>
                </Paper>
            );
        }

        if (equiposFiltrados.length === 0 && equipos.length === 0) {
            return (
                <Alert severity="info" icon={<CampaignIcon />}>
                    No hay equipos disponibles en el centro
                </Alert>
            );
        }

        return (
            <>
                {/* Barra de búsqueda para equipos */}
                <Box sx={{ mb: 4 }}>
                    <TextField
                        fullWidth
                        placeholder="Buscar por nombre de equipo, coordinador o campaña..."
                        value={searchEquipos}
                        onChange={handleSearchEquipos}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'primary.main' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            maxWidth: 600,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                                bgcolor: 'background.paper',
                                boxShadow: theme.palette.mode === 'light'
                                    ? '0 2px 8px rgba(0,0,0,0.08)'
                                    : '0 2px 8px rgba(0,0,0,0.3)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: theme.palette.mode === 'light'
                                        ? '0 4px 12px rgba(0,0,0,0.12)'
                                        : '0 4px 12px rgba(0,0,0,0.4)',
                                },
                                '&.Mui-focused': {
                                    boxShadow: theme.palette.mode === 'light'
                                        ? '0 4px 16px rgba(102, 126, 234, 0.25)'
                                        : '0 4px 16px rgba(102, 126, 234, 0.15)',
                                }
                            }
                        }}
                    />
                </Box>

                {equiposFiltrados.length === 0 ? (
                    <Alert severity="warning">
                        No se encontraron equipos con ese criterio de búsqueda
                    </Alert>
                ) : (
            <Paper 
                elevation={0}
                sx={{ 
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: 2,
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                            <TableRow sx={{ 
                                backgroundColor: theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)',
                                borderBottom: `2px solid ${theme.palette.primary.main}`
                            }}>
                                <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}><strong>Equipo</strong></TableCell>
                                <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}><strong>Coordinador</strong></TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.primary }}><strong>Agentes</strong></TableCell>
                                <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}><strong>Campaña</strong></TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.primary }}><strong>Acciones</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {equiposFiltrados.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((equipo, index) => (
                                <TableRow
                                    key={equipo.equipo_id}
                                    hover
                                    sx={{ 
                                        backgroundColor: theme.palette.mode === 'light'
                                            ? (index % 2 === 0 ? 'white' : '#FAFCFE')
                                            : (index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'),
                                        '&:hover': {
                                            backgroundColor: theme.palette.mode === 'light' 
                                                ? '#F8FBFF' 
                                                : 'rgba(255, 255, 255, 0.05)',
                                        },
                                        transition: 'background-color 0.2s ease',
                                        borderBottom: theme.palette.mode === 'light' 
                                            ? '1px solid rgba(12, 21, 90, 0.1)'
                                            : '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                >
                                    <TableCell>{equipo.nombre}</TableCell>
                                    <TableCell>{equipo.coordinador_nombre || 'Sin coordinador'}</TableCell>
                                    <TableCell align="center">
                                        {equipo.total_agentes}
                                    </TableCell>
                                    <TableCell>{equipo.campana_nombre}</TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Ver KPIs" arrow>
                                            <IconButton
                                                onClick={() => fetchEquipoDetalle(equipo)}
                                                size="small"
                                                sx={{
                                                    bgcolor: 'action.hover',
                                                    '&:hover': {
                                                        bgcolor: 'primary.main',
                                                        color: 'white',
                                                    },
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <BarChartIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: theme.palette.background.paper }}>
                  <Typography variant="body2" color="text.secondary">
                    Mostrando {equiposFiltrados.slice(page * rowsPerPage, (page + 1) * rowsPerPage).length} de {equiposFiltrados.length} equipos
                  </Typography>
                  <Pagination
                    count={Math.ceil(equiposFiltrados.length / rowsPerPage)}
                    page={page + 1}
                    onChange={(event, value) => handleChangePage(event, value - 1)}
                    color="primary"
                    shape="rounded"
                    size="medium"
                  />
                </Box>
            </Paper>
                )}
            </>
        );
    };

    // Renderizar KPIs de equipo
    const renderKpisEquipo = () => {
        if (!equipoSeleccionado) return null;

        return (
            <>
                <Box
                    sx={{
                        background: theme.palette.mode === 'light'
                            ? 'linear-gradient(135deg, #2c86eeff 0%, #2a15e9ff 100%)'
                            : 'linear-gradient(135deg, #0C155A 0%, #040c47ff 100%)',
                        borderRadius: 3,
                        p: 3,
                        mb: 4,
                        color: 'white',
                        boxShadow: theme.palette.mode === 'light'
                            ? '0 8px 32px rgba(102, 126, 234, 0.25)'
                            : '0 8px 32px rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 2,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton
                            onClick={handleVolverALista}
                            sx={{
                                color: 'white',
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                                },
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {equipoSeleccionado.nombre}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Campaña: {equipoSeleccionado.campana_nombre}
                            </Typography>
                            {equipoSeleccionado.coordinador_nombre && (
                                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                                    Coordinador: {equipoSeleccionado.coordinador_nombre}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Box>

                {loadingEquipoDetalle ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <CircularProgress />
                            <Typography sx={{ mt: 2 }}>Cargando KPIs del equipo...</Typography>
                        </Box>
                    </Box>
                ) : (
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <div className="kpi-label">Llamadas activas</div>
                            <div className="kpi-value-row">
                                <div className="kpi-value">{equipoLlamadasActivas}</div>
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-label">Agentes disponibles</div>
                            <div className="kpi-value-row">
                                <div className="kpi-value">{equipoAgentesDisponibles}</div>
                                <span className="kpi-chip">de {equipoTotalAgentes}</span>
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-label">Tiempo promedio de llamada</div>
                            <div className="kpi-value-row">
                                <div className="kpi-value">{fmtSecs(equipoTiempoPromedioLlamada)}</div>
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-label">Llamadas del período</div>
                            <div className="kpi-value-row">
                                <div className="kpi-value">{equipoLlamadasDelDia}</div>
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-label">Ventas realizadas</div>
                            <div className="kpi-value-row">
                                <div className="kpi-value">{equipoVentasRealizadas}</div>
                            </div>
                        </div>

                        <div className="kpi-card kpi-highlight">
                            <div className="kpi-label">Tasa de conversión</div>
                            <div className="kpi-value-row">
                                <div className="kpi-value">{equipoTasaConversion.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <MainLayout title="KPIs del Centro">
            <div
                className="kpi-page"
                style={{
                    '--text-primary': theme.palette.text.primary,
                    '--text-secondary': theme.palette.text.secondary,
                    '--background-paper': theme.palette.background.paper,
                    '--primary-main': theme.palette.primary.main,
                    '--primary-dark': isDark ? theme.palette.primary.dark : '#1a2b7a',
                    '--campaign-filter-bg': isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFB',
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
                {/* Header con información del centro y botón de actualizar */}
                <div className="kpi-header">
                    <div>
                        <h2>KPIs del Centro</h2>
                        {centroNombre && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
                                {centroNombre}
                            </Typography>
                        )}
                    </div>
                    <div className="kpi-actions">
                        {updatedAt && (
                            <span className="update-badge">
                                Última actualización: {new Date(updatedAt).toLocaleString()}
                            </span>
                        )}
                        {!exportando ? (
                            <ButtonTooltip
                                title="Exportar KPI"
                                icon={<PictureAsPdfIcon />}
                                onClick={handleExportarPDF}
                                color="error"
                            />
                        ) : (
                            <ButtonTooltip
                                title="Exportando..."
                                icon={<CircularProgress size={24} sx={{ color: 'white' }} />}
                                onClick={() => {}}
                                color="error"
                            />
                        )}
                        <Tooltip title="Actualizar">
                          <span>
                            <IconButton
                              onClick={() => {
                                  if (tabValue === 0) {
                                      fetchData();
                                  } else {
                                      if (equipoSeleccionado) {
                                          fetchEquipoDetalle(equipoSeleccionado);
                                      } else {
                                          setPage(0); // Resetear a primera página al refresh
                                          fetchEquipos();
                                      }
                                  }
                              }}
                              disabled={loading || loadingEquipos || loadingEquipoDetalle}
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
                                  animation: (loading || loadingEquipos || loadingEquipoDetalle) ? "spin 1s linear infinite" : "none",
                                  "@keyframes spin": {
                                    "0%": { transform: "rotate(0deg)" },
                                    "100%": { transform: "rotate(360deg)" },
                                  },
                                }}
                              />
                            </IconButton>
                          </span>
                        </Tooltip>
                    </div>
                </div>

                {/* Pestañas */}
                <div 
                    className="kpi-filters" 
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '20px',
                    }}
                >
                    <div className="segmented">
                        <button
                            className={tabValue === 0 ? "active" : ""}
                            onClick={() => handleTabChange(null, 0)}
                        >
                            Campaña
                        </button>
                        <button
                            className={tabValue === 1 ? "active" : ""}
                            onClick={() => handleTabChange(null, 1)}
                        >
                            Equipos
                        </button>
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

                    <div className="dates">
                        <label>
                            Desde
                            <input
                                type="date"
                                value={from}
                                max={toLocalDateString(new Date())}
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
                                max={toLocalDateString(new Date())}
                                min={from}
                                onChange={(e) => {
                                    setTo(e.target.value);
                                    setMode("custom");
                                }}
                            />
                        </label>
                    </div>
                </div>

                {/* Filtro por campaña (solo en pestaña Campaña) */}
                {tabValue === 0 && campanasParaFiltro.length > 0 && (
                    <div className="kpi-filters" style={{ marginBottom: '20px' }}>
                        <FormControl fullWidth size="small" sx={{ maxWidth: "100%" }}>
                            <InputLabel id="campana-filter-label">Filtrar por Campaña</InputLabel>
                            <Select
                                labelId="campana-filter-label"
                                value={campanaSeleccionada}
                                label="Filtrar por Campaña"
                                onChange={(e) => setCampanaSeleccionada(e.target.value)}
                                sx={{
                                    backgroundColor: 'var(--date-bg)',
                                    borderColor: 'var(--date-border)',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'var(--date-border)',
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'var(--date-border)',
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'var(--primary-main)',
                                    },
                                }}
                            >
                                <MenuItem value="">
                                    <em>Todas las campañas</em>
                                </MenuItem>
                                {campanasParaFiltro.map((camp) => (
                                    <MenuItem key={camp.id} value={camp.id}>
                                        {camp.nombre}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>
                )}

                {errMsg && (
                    <div style={{ marginBottom: 14 }}>
                        <Alert severity="error">{errMsg}</Alert>
                    </div>
                )}

                {/* Contenido según pestaña activa */}
                {tabValue === 0 && (
                    /* Pestaña Campaña */
                    <>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                                <CircularProgress />
                            </Box>
                        ) : data?.mensaje ? (
                            <Alert severity="info" icon={<CampaignIcon />}>
                                {data.mensaje}
                            </Alert>
                        ) : (
                            <>
                                {/* KPIs Totales */}
                                {!campanaSeleccionada && campanas.length > 1 && (
                                    <>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
                                            Resumen Global ({totalCampanasActivas} {totalCampanasActivas === 1 ? 'campaña activa' : 'campañas activas'})
                                        </Typography>
                                        <div className="kpi-grid">
                                            <div className="kpi-card">
                                                <div className="kpi-label">Llamadas activas</div>
                                                <div className="kpi-value-row">
                                                    <div className="kpi-value">{totales.llamadas_activas}</div>
                                                </div>
                                            </div>

                                            <div className="kpi-card">
                                                <div className="kpi-label">Tiempo promedio de llamada</div>
                                                <div className="kpi-value-row">
                                                    <div className="kpi-value">{fmtSecs(totales.tiempo_promedio_llamada)}</div>
                                                </div>
                                            </div>

                                            <div className="kpi-card">
                                                <div className="kpi-label">Llamadas del período</div>
                                                <div className="kpi-value-row">
                                                    <div className="kpi-value">{totales.llamadas_del_periodo}</div>
                                                </div>
                                            </div>

                                            <div className="kpi-card">
                                                <div className="kpi-label">Ventas realizadas</div>
                                                <div className="kpi-value-row">
                                                    <div className="kpi-value">{totales.ventas_realizadas}</div>
                                                </div>
                                            </div>

                                            <div className="kpi-card kpi-highlight">
                                                <div className="kpi-label">Tasa de conversión</div>
                                                <div className="kpi-value-row">
                                                    <div className="kpi-value">{totales.tasa_conversion.toFixed(1)}%</div>
                                                </div>
                                            </div>
                                        </div>

                                        <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 700, color: 'text.primary' }}>
                                            Detalle por Campaña
                                        </Typography>
                                    </>
                                )}

                                {/* Tabla de Campañas */}
                                <Paper 
                                    elevation={0}
                                    sx={{ 
                                        backgroundColor: theme.palette.background.paper,
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                        <TableContainer>
                                            <Table>
                                            <TableHead>
                                                <TableRow sx={{ 
                                                    backgroundColor: theme.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)',
                                                    borderBottom: `2px solid ${theme.palette.primary.main}`
                                                }}>
                                                    <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}><strong>Campaña</strong></TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.primary }}><strong>Llamadas Activas</strong></TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.primary }}><strong>Tiempo Promedio</strong></TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.primary }}><strong>Llamadas del Período</strong></TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.primary }}><strong>Ventas</strong></TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.primary }}><strong>Tasa de Conversión</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {campanas.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} align="center">
                                                            <Typography color="text.secondary" sx={{ py: 3 }}>
                                                                No hay datos disponibles
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    campanasFiltradas.slice(pageCampanas * rowsPerPageCampanas, (pageCampanas + 1) * rowsPerPageCampanas).map((campana, index) => (
                                                        <TableRow
                                                            key={campana.campana_id}
                                                            hover
                                                            sx={{ 
                                                                backgroundColor: theme.palette.mode === 'light'
                                                                    ? (index % 2 === 0 ? 'white' : '#FAFCFE')
                                                                    : (index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'),
                                                                '&:hover': {
                                                                    backgroundColor: theme.palette.mode === 'light' 
                                                                        ? '#F8FBFF' 
                                                                        : 'rgba(255, 255, 255, 0.05)',
                                                                },
                                                                transition: 'background-color 0.2s ease',
                                                                borderBottom: theme.palette.mode === 'light' 
                                                                    ? '1px solid rgba(12, 21, 90, 0.1)'
                                                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                                            }}
                                                        >
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight={600}>
                                                                    {campana.campana_nombre}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Chip
                                                                    label={campana.llamadas_activas}
                                                                    size="small"
                                                                    color={campana.llamadas_activas > 0 ? 'primary' : 'default'}
                                                                    sx={{ fontWeight: 600, minWidth: 50 }}
                                                                />
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography variant="body2" color="text.primary">
                                                                    {fmtSecs(campana.tiempo_promedio_llamada)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography variant="body2" fontWeight={600} color="text.primary">
                                                                    {campana.llamadas_del_periodo}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Chip
                                                                    label={campana.ventas_realizadas}
                                                                    size="small"
                                                                    color="success"
                                                                    sx={{ fontWeight: 600, minWidth: 50 }}
                                                                />
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Box
                                                                    sx={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        px: 1.5,
                                                                        py: 0.5,
                                                                        borderRadius: 2,
                                                                        backgroundColor: isDark
                                                                            ? 'rgba(47, 118, 230, 0.15)'
                                                                            : 'rgba(47, 118, 230, 0.1)',
                                                                        fontWeight: 700,
                                                                        fontSize: '0.875rem',
                                                                        color: theme.palette.primary.main,
                                                                        minWidth: 60,
                                                                    }}
                                                                >
                                                                    {campana.tasa_conversion.toFixed(1)}%
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: theme.palette.background.paper }}>
                                      <Typography variant="body2" color="text.secondary">
                                        Mostrando {campanasFiltradas.slice(pageCampanas * rowsPerPageCampanas, (pageCampanas + 1) * rowsPerPageCampanas).length} de {campanasFiltradas.length} campañas
                                      </Typography>
                                      <Pagination
                                        count={Math.ceil(campanasFiltradas.length / rowsPerPageCampanas)}
                                        page={pageCampanas + 1}
                                        onChange={handleChangePageCampanas}
                                        color="primary"
                                        shape="rounded"
                                        size="medium"
                                      />
                                    </Box>
                                </Paper>
                            </>
                        )}
                    </>
                )}

                {tabValue === 1 && (
                    /* Pestaña Equipos */
                    <>
                        {equipoSeleccionado ? renderKpisEquipo() : renderTablaEquipos()}
                    </>
                )}
            </div>
        </MainLayout>
    );
}
