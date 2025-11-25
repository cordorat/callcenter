// PATH: src/pages/Kpis/KpisJefeCampana.jsx
import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { getCampanaKpiOverview, getEquiposJefeCampana, getEquipoKpiDetalle, exportarJefeCampanaKpisPDF,getAgentesJefeCampana, getAgenteKpiDetalleJefe } from "@/core/api/kpis";
import { historialJefeService } from "@/core/api/historialJefeCampana";
import { AGENT_STATUSES, mapBackendToFrontend } from '@/core/api/agentStates';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@mui/material/styles';
import ButtonTooltip from "@/components/campaing/ButtonTooltip";
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

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
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    TextField,
    InputAdornment,
    Button,
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

// Función helper para formatear el label del estado
const formatEstadoLabel = (estado) => {
    switch (estado) {
        case 'ACTIVA':
            return 'Activa';
        case 'NO_ACTIVA':
            return 'No Activa';
        case 'PAUSADA':
            return 'Pausada';
        case 'FINALIZADA':
            return 'Finalizada';
        default:
            return estado;
    }
};

export default function KpisJefeCampana() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    // Estado de pestañas
    const [tabValue, setTabValue] = React.useState(0); // 0 = Campaña, 1 = Equipos, 2 = Agentes

    // Estado de campañas
    const [campanas, setCampanas] = React.useState([]);
    const [campanaSeleccionada, setCampanaSeleccionada] = React.useState("");
    const [loadingCampanas, setLoadingCampanas] = React.useState(true);

    // Estado de filtros de fecha
    const [mode, setMode] = React.useState("day"); // day|week|month|custom
    const [from, setFrom] = React.useState(todayRange().from);
    const [to, setTo] = React.useState(todayRange().to);

    // Estado de datos de campaña
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [errMsg, setErrMsg] = React.useState("");
    const [updatedAt, setUpdatedAt] = React.useState(null);

    // Estado de equipos
    const [equipos, setEquipos] = React.useState([]);
    const [loadingEquipos, setLoadingEquipos] = React.useState(false);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [totalEquipos, setTotalEquipos] = React.useState(0);
    
    // Estado de detalle de equipo
    const [equipoSeleccionado, setEquipoSeleccionado] = React.useState(null);
    const [dataEquipo, setDataEquipo] = React.useState(null);
    const [loadingEquipoDetalle, setLoadingEquipoDetalle] = React.useState(false);
    
    // Estado para exportación
    const [exportando, setExportando] = React.useState(false);
    // Estado de agentes
    const [agentes, setAgentes] = React.useState([]);
    const [loadingAgentes, setLoadingAgentes] = React.useState(false);
    const [pageAgentes, setPageAgentes] = React.useState(0);
    const [rowsPerPageAgentes, setRowsPerPageAgentes] = React.useState(10);
    const [totalAgentes, setTotalAgentes] = React.useState(0);
    const [searchAgentes, setSearchAgentes] = React.useState('');
    const [filtroEstado, setFiltroEstado] = React.useState('');
    const [filtroEquipo, setFiltroEquipo] = React.useState('');
    
    // Estado de detalle de agente
    const [agenteSeleccionado, setAgenteSeleccionado] = React.useState(null);
    const [dataAgente, setDataAgente] = React.useState(null);
    const [loadingAgenteDetalle, setLoadingAgenteDetalle] = React.useState(false);

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
                } else if (campanasData.length > 1) {
                    // Validar que campanaSeleccionada actual esté en la lista
                    // Si no está o no existe, seleccionar la primera campaña disponible
                    const campanaActualValida = campanasData.some(c => c.id === campanaSeleccionada);
                    if (!campanaActualValida) {
                        setCampanaSeleccionada(campanasData[0].id);
                    }
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
            if (tabValue === 0) {
                fetchData();
            } else if (tabValue === 1) {
                fetchEquipos();
            } else if (tabValue === 2) {
                fetchAgentes();
            }
        }
    }, [from, to, campanaSeleccionada, loadingCampanas, tabValue]);

    // Fetch lista de equipos
    const fetchEquipos = async () => {
        if (campanas.length > 1 && !campanaSeleccionada) {
            return;
        }

        setLoadingEquipos(true);
        setErrMsg("");
        try {
            const params = {
                page: page + 1, // Backend usa 1-indexed
                page_size: rowsPerPage,
            };

            if (campanaSeleccionada) {
                params.campana_id = campanaSeleccionada;
            }

            const resp = await getEquiposJefeCampana(params);
            setEquipos(resp.results || []);
            setTotalEquipos(resp.count || 0);
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
            const params = {
                fecha_desde: from,
                fecha_hasta: to,
            };

            const resp = await getEquipoKpiDetalle(equipo.equipo_id, params);
            setDataEquipo(resp || null);
            setUpdatedAt(resp?.fecha_consulta || new Date().toISOString());
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

    // Función para exportar KPIs a PDF
    const handleExportarPDF = async () => {
        setExportando(true);
        try {
            const response = await exportarJefeCampanaKpisPDF({
                campana_id: campanaSeleccionada || (campanas.length === 1 ? campanas[0].id : null),
                fecha_desde: from,
                fecha_hasta: to,
            });

            // Crear un blob y descargar el archivo
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `KPIs_Campana_${from}_${to}.pdf`;
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

    // Fetch lista de agentes
    const fetchAgentes = async () => {
        if (campanas.length > 1 && !campanaSeleccionada) {
            return;
        }

        setLoadingAgentes(true);
        setErrMsg("");
        try {
            const params = {
                page: pageAgentes + 1, // Backend usa 1-indexed
                page_size: rowsPerPageAgentes,
            };

            if (campanaSeleccionada) {
                params.campana_id = campanaSeleccionada;
            }

            if (searchAgentes) {
                params.search = searchAgentes;
            }

            if (filtroEstado) {
                params.estado = filtroEstado;
            }

            if (filtroEquipo) {
                params.equipo_id = filtroEquipo;
            }

            const resp = await getAgentesJefeCampana(params);
            setAgentes(resp.results || []);
            setTotalAgentes(resp.count || 0);
        } catch (e) {
            console.error(e);
            setErrMsg("No se pudieron cargar los agentes. Intenta nuevamente.");
        } finally {
            setLoadingAgentes(false);
        }
    };

    // Fetch KPIs de agente específico
    const fetchAgenteDetalle = async (agente) => {
        setAgenteSeleccionado(agente);
        setLoadingAgenteDetalle(true);
        setErrMsg("");
        try {
            const params = {
                fecha_desde: from,
                fecha_hasta: to,
            };

            const resp = await getAgenteKpiDetalleJefe(agente.id, params);
            setDataAgente(resp || null);
            setUpdatedAt(resp?.fecha_consulta || new Date().toISOString());
        } catch (e) {
            console.error(e);
            setErrMsg("No se pudieron cargar los KPIs del agente. Intenta nuevamente.");
        } finally {
            setLoadingAgenteDetalle(false);
        }
    };

    // Volver a la lista de agentes
    const handleVolverAListaAgentes = () => {
        setAgenteSeleccionado(null);
        setDataAgente(null);
    };

    // Cambiar pestaña
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setErrMsg("");
        
        // Resetear estado de equipo/agente seleccionado al cambiar de pestaña
        if (newValue === 0) {
            setEquipoSeleccionado(null);
            setDataEquipo(null);
            setAgenteSeleccionado(null);
            setDataAgente(null);
        } else if (newValue === 1) {
            setAgenteSeleccionado(null);
            setDataAgente(null);
        } else if (newValue === 2) {
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

    // Manejar cambio de página en tabla de agentes
    const handleChangePageAgentes = (event, newPage) => {
        setPageAgentes(newPage);
    };

    // Manejar cambio de filas por página de agentes
    const handleChangeRowsPerPageAgentes = (event) => {
        setRowsPerPageAgentes(parseInt(event.target.value, 10));
        setPageAgentes(0);
    };

    // Recargar equipos cuando cambia la paginación
    React.useEffect(() => {
        if (tabValue === 1 && !equipoSeleccionado && (campanaSeleccionada || campanas.length === 1)) {
            fetchEquipos();
        }
    }, [page, rowsPerPage]);

    // Recargar agentes cuando cambia la paginación o filtros
    React.useEffect(() => {
        if (tabValue === 2 && !agenteSeleccionado && (campanaSeleccionada || campanas.length === 1)) {
            fetchAgentes();
        }
    }, [pageAgentes, rowsPerPageAgentes, searchAgentes, filtroEstado, filtroEquipo]);

    // Renderizar selector de campaña
    const renderSelectorCampana = () => {
        if (loadingCampanas) {
            return (
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                    <CircularProgress size={24} />
                    <Typography sx={{ mt: 1 }}>Cargando campañas...</Typography>
                </Paper>
            );
        }

        if (campanas.length === 0) {
            return (
                <Alert severity="warning">
                    No hay campañas asignadas en el momento.
                </Alert>
            );
        }

        // Si solo tiene una campaña, mostrar info
        if (campanas.length === 1) {
            const campana = campanas[0];
            return (
                <Paper elevation={2} sx={{ p: 2, width: 'fit-content' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                            {campana.nombre}
                        </Typography>
                        {campana.estado && (
                            <Chip
                                label={formatEstadoLabel(campana.estado)}
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
            <Paper elevation={2} sx={{ p: 2, width: 'fit-content', minWidth: 400 }}>
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
                                            label={formatEstadoLabel(camp.estado)}
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

    // Extraer datos de campaña
    const llamadasActivas = Number(data?.llamadas_activas || 0);
    const agentesDisponibles = Number(data?.agentes_disponibles || 0);
    const tiempoPromedioLlamada = Number(data?.tiempo_promedio_llamada || 0);
    const llamadasDelDia = Number(data?.llamadas_del_dia || 0);
    const ventasRealizadas = Number(data?.ventas_realizadas || 0);
    const tasaConversion = Number(data?.tasa_conversion || 0);
    const totalAgentesCampana = Number(data?.total_agentes || 0);

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

        if (equipos.length === 0) {
            return (
                <Alert severity="info">
                    No hay equipos asignados a esta campaña.
                </Alert>
            );
        }

        return (
            <Paper elevation={2} sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f5f5f5' }}>
                                <TableCell><strong>Equipo</strong></TableCell>
                                <TableCell><strong>Coordinador</strong></TableCell>
                                <TableCell align="center"><strong>Agentes</strong></TableCell>
                                <TableCell><strong>Campaña</strong></TableCell>
                                <TableCell align="center"><strong>Acciones</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {equipos.map((equipo) => (
                                <TableRow
                                    key={equipo.equipo_id}
                                    hover
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell>{equipo.nombre}</TableCell>
                                    <TableCell>{equipo.coordinador_nombre || 'Sin coordinador'}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={equipo.total_agentes}
                                            size="small"
                                            color={equipo.total_agentes > 0 ? 'primary' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>{equipo.campana_nombre}</TableCell>
                                    <TableCell align="center">
                                        <button
                                            className="btn"
                                            onClick={() => fetchEquipoDetalle(equipo)}
                                            style={{ padding: '6px 16px', fontSize: '0.875rem' }}
                                        >
                                            Ver KPIs
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={totalEquipos}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Equipos por página:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                />
            </Paper>
        );
    };

    // Renderizar KPIs de equipo
    const renderKpisEquipo = () => {
        if (!equipoSeleccionado) return null;

        return (
            <>
                {/* Botón para volver */}
                <Paper elevation={2} sx={{ p: 2, mb: 2, width: 'fit-content' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <IconButton onClick={handleVolverALista} size="small">
                            <ArrowBackIcon />
                        </IconButton>
                        <Stack>
                            <Typography variant="h6" fontWeight={700}>
                                {equipoSeleccionado.nombre}
                            </Typography>
                            {equipoSeleccionado.coordinador_nombre && (
                                <Typography variant="body2" color="text.secondary">
                                    Coordinador: {equipoSeleccionado.coordinador_nombre}
                                </Typography>
                            )}
                        </Stack>
                    </Stack>
                </Paper>

                {loadingEquipoDetalle ? (
                    <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>Cargando KPIs del equipo...</Typography>
                    </Paper>
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

    // Renderizar tabla de agentes
    const renderTablaAgentes = () => {
        if (loadingAgentes) {
            return (
                <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }}>Cargando agentes...</Typography>
                </Paper>
            );
        }

        if (agentes.length === 0) {
            return (
                <Alert severity="info">
                    No hay agentes asignados a esta campaña.
                </Alert>
            );
        }

        return (
            <Paper elevation={2} sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f5f5f5' }}>
                                <TableCell><strong>Nombre</strong></TableCell>
                                <TableCell><strong>Email</strong></TableCell>
                                <TableCell align="center"><strong>Equipo</strong></TableCell>
                                <TableCell align="center"><strong>Estado</strong></TableCell>
                                <TableCell align="center"><strong>Acciones</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {agentes.map((agente) => (
                                <TableRow
                                    key={agente.id}
                                    hover
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, rgba(47, 118, 230, 0.12), rgba(47, 118, 230, 0.08))', color: 'primary.main', flexShrink: 0 }}>
                                                <PersonIcon sx={{ fontSize: 16 }} />
                                            </Box>
                                            <span>{agente.nombre_completo}</span>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{agente.email}</TableCell>
                                    <TableCell align="center">{agente.equipo_nombre}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={agente.estado_label || 'Sin estado'}
                                            size="small"
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '0.75rem',
                                                height: '24px',
                                                backgroundColor: (() => {
                                                    const frontendState = mapBackendToFrontend(agente.estado_actual);
                                                    const status = AGENT_STATUSES.find(s => s.value === frontendState);
                                                    const color = status?.color || '#9e9e9e';
                                                    return isDark ? `${color}33` : `${color}1A`;
                                                })(),
                                                color: (() => {
                                                    const frontendState = mapBackendToFrontend(agente.estado_actual);
                                                    const status = AGENT_STATUSES.find(s => s.value === frontendState);
                                                    return status?.color || '#9e9e9e';
                                                })(),
                                                border: (() => {
                                                    const frontendState = mapBackendToFrontend(agente.estado_actual);
                                                    const status = AGENT_STATUSES.find(s => s.value === frontendState);
                                                    const color = status?.color || '#9e9e9e';
                                                    return `1px solid ${isDark ? color + '4D' : color + '66'}`;
                                                })(),
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button
                                            endIcon={<KeyboardArrowRightIcon />}
                                            size="small"
                                            variant="text"
                                            onClick={() => fetchAgenteDetalle(agente)}
                                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px' }}
                                        >
                                            Ver KPIs
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={totalAgentes}
                    rowsPerPage={rowsPerPageAgentes}
                    page={pageAgentes}
                    onPageChange={handleChangePageAgentes}
                    onRowsPerPageChange={handleChangeRowsPerPageAgentes}
                    labelRowsPerPage="Agentes por página:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                />
            </Paper>
        );
    };

    // Renderizar KPIs de agente
    const renderKpisAgente = () => {
        if (!agenteSeleccionado) return null;

        return (
            <>
                {/* Botón para volver */}
                <Paper elevation={2} sx={{ p: 2, mb: 2, width: 'fit-content' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <IconButton onClick={handleVolverAListaAgentes} size="small">
                            <ArrowBackIcon />
                        </IconButton>
                        <Stack>
                            <Typography variant="h6" fontWeight={700}>
                                {agenteSeleccionado.nombre_completo}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {agenteSeleccionado.email}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Equipo: {agenteSeleccionado.equipo_nombre}
                            </Typography>
                        </Stack>
                    </Stack>
                </Paper>

                {loadingAgenteDetalle ? (
                    <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>Cargando KPIs del agente...</Typography>
                    </Paper>
                ) : (
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <div className="kpi-label">Tiempo promedio de llamada</div>
                            <div className="kpi-value-row">
                                <div className="kpi-value">{fmtSecs(dataAgente?.tiempo_promedio_llamada || 0)}</div>
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-label">Llamadas del período</div>
                            <div className="kpi-value-row">
                                <div className="kpi-value">{dataAgente?.llamadas_del_dia || 0}</div>
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-label">Ventas realizadas</div>
                            <div className="kpi-value-row">
                                <div className="kpi-value">{dataAgente?.ventas_realizadas || 0}</div>
                            </div>
                        </div>

                        <div className="kpi-card kpi-highlight">
                            <div className="kpi-label">Tasa de conversión</div>
                            <div className="kpi-value-row">
                                <div className="kpi-value">{(dataAgente?.tasa_conversion || 0).toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

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
                {/* Header con selector de campaña y botón de actualizar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    {/* Selector de Campaña */}
                    <div>
                        {renderSelectorCampana()}
                    </div>

                    {/* Botón de actualizar - Solo visible con campaña seleccionada */}
                    {(campanaSeleccionada || campanas.length === 1) && (
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
                            <button 
                                className="btn" 
                                onClick={() => {
                                    if (tabValue === 0) {
                                        fetchData();
                                    } else if (equipoSeleccionado) {
                                        fetchEquipoDetalle(equipoSeleccionado);
                                    } else {
                                        fetchEquipos();
                                    }
                                }} 
                                disabled={loading || loadingEquipos || loadingEquipoDetalle}
                            >
                                {(loading || loadingEquipos || loadingEquipoDetalle) ? 
                                    <RefreshIcon fontSize="small" className="spinning" /> : 
                                    <RefreshIcon fontSize="small" />
                                }
                            </button>
                        </div>
                    )}
                </div>

                {/* Pestañas */}
                {(campanaSeleccionada || campanas.length === 1) && (
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
                            <button
                                className={tabValue === 2 ? "active" : ""}
                                onClick={() => handleTabChange(null, 2)}
                            >
                                Agentes
                            </button>
                        </div>
                    </div>
                )}

                {/* Mostrar filtros y contenido solo si hay campaña seleccionada */}
                {(campanaSeleccionada || campanas.length === 1) && (
                    <>
                        {/* Filtros de fecha - Solo visible en pestaña Campaña */}
                        {tabValue === 0 && (
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
                        )}

                        {errMsg && (
                            <div style={{ marginBottom: 14 }}>
                                <Alert severity="error">{errMsg}</Alert>
                            </div>
                        )}

                        {/* Contenido según pestaña activa */}
                        {tabValue === 0 && (
                            /* KPIs de Campaña */
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
                                    <span className="kpi-chip">de {totalAgentesCampana}</span>
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
                        )}

                        {tabValue === 1 && (
                            /* Vista de Equipos */
                            <>
                                {equipoSeleccionado ? renderKpisEquipo() : renderTablaEquipos()}
                            </>
                        )}

                        {tabValue === 2 && (
                            /* Vista de Agentes */
                            <>
                                {agenteSeleccionado ? renderKpisAgente() : (
                                    <>
                                        {/* Barra de búsqueda y filtros */}
                                        <Box sx={{ mb: 3 }}>
                                            <TextField
                                                fullWidth
                                                placeholder="Buscar por nombre o email..."
                                                value={searchAgentes}
                                                onChange={(e) => setSearchAgentes(e.target.value)}
                                                disabled={loadingAgentes}
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
                                                    }
                                                }}
                                            />
                                        </Box>
                                        {renderTablaAgentes()}
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </MainLayout>
    );
}
