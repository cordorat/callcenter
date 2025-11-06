// PATH: src/pages/Historial/HistorialJefeCampana.jsx
// -----------------------------------------------------------------------------
// Historial de llamadas para Jefe de Campaña (React + MUI)
// Funcionalidad:
// - Selector de campaña (si tiene más de una)
// - Filtros: agente, teléfono, estado (contestada/no contestada)
// - Paginación automática (6 registros por página)
// - Vista detallada con información de venta, notas y cliente
// Backend: /calls/historial-jefe/
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { useAuth } from "@/core/context/AuthContext";
import { historialJefeService } from "@/core/api/historialJefe";

import {
    Box,
    Paper,
    Stack,
    Typography,
    TextField,
    InputAdornment,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Tooltip,
    Divider,
    CircularProgress,
    Alert,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Collapse,
    Button,
    Pagination,
    Card,
    CardContent,
    Grid,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import NotesIcon from "@mui/icons-material/Notes";

// ======================== Utilidades ========================
const formatearDuracion = (seg) => {
    if (!seg || seg <= 0) return "0s";
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const estadoToChip = (fueContestada) => {
    if (fueContestada === true) {
        return { label: "Contestada", color: "success", icon: <CheckCircleIcon /> };
    }
    return { label: "No contestada", color: "error", icon: <CancelIcon /> };
};

const toYMD = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
        dt.getDate()
    ).padStart(2, "0")}`;
};

const formatearMonto = (monto) => {
    if (!monto) return "N/A";
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
    }).format(monto);
};

// ======================== Estilos ========================
const cardSx = (theme) => ({
    p: 2,
    mb: 2,
    borderRadius: 2.25,
    boxShadow:
        theme.palette.mode === "light"
            ? "0 6px 18px rgba(12,21,90,0.08)"
            : "0 6px 18px rgba(0,0,0,0.45)",
    backgroundColor: theme.palette.background.paper,
    border:
        theme.palette.mode === "light"
            ? "1px solid rgba(12,21,90,0.06)"
            : "1px solid rgba(255,255,255,0.08)",
});

// ======================== Botón circular ========================
function RefreshCircle({ onClick, loading }) {
    return (
        <Tooltip title="Actualizar">
            <IconButton
                onClick={onClick}
                disabled={loading}
                sx={(theme) => ({
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    backgroundColor:
                        theme.palette.mode === "light"
                            ? theme.palette.primary.dark
                            : theme.palette.primary.main,
                    color: theme.palette.getContrastText(theme.palette.primary.main),
                    boxShadow:
                        theme.palette.mode === "light"
                            ? "0 6px 16px rgba(12,21,90,0.35)"
                            : "0 6px 16px rgba(0,0,0,0.7)",
                    "&:hover": {
                        backgroundColor:
                            theme.palette.mode === "light"
                                ? theme.palette.primary.main
                                : theme.palette.primary.light,
                        transform: "scale(1.05)",
                    },
                    transition: "all .15s ease",
                })}
            >
                {loading ? <CircularProgress size={20} sx={{ color: "inherit" }} /> : <RefreshIcon />}
            </IconButton>
        </Tooltip>
    );
}

// ======================== Componente principal ========================
export default function HistorialJefeCampana() {
    const { user } = useAuth();
    const today = toYMD(new Date());

    // Campañas
    const [campanas, setCampanas] = useState([]);
    const [campanaSeleccionada, setCampanaSeleccionada] = useState("");
    const [loadingCampanas, setLoadingCampanas] = useState(true);

    // Filtros
    const [agenteNombre, setAgenteNombre] = useState("");
    const [telefono, setTelefono] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState("todos"); // todos | contestada | no_contestada
    const [fechaInicio, setFechaInicio] = useState(today);
    const [fechaFin, setFechaFin] = useState(today);

    // Datos
    const [rows, setRows] = useState([]);
    const [openRows, setOpenRows] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [snack, setSnack] = useState(null);

    // Paginación
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 6;

    const debounceRef = useRef(null);

    // ======================== Cargar Campañas ========================
    useEffect(() => {
        const cargarCampanas = async () => {
            try {
                setLoadingCampanas(true);
                const data = await historialJefeService.getMisCampanas();
                setCampanas(data.campanas || []);

                // Si solo tiene una campaña, seleccionarla automáticamente
                if (data.campanas && data.campanas.length === 1) {
                    setCampanaSeleccionada(data.campanas[0].id);
                }
            } catch (e) {
                console.error("Error cargando campañas:", e);
                setError("No se pudieron cargar las campañas");
            } finally {
                setLoadingCampanas(false);
            }
        };

        cargarCampanas();
    }, []);

    // ======================== Fetch Data ========================
    const fetchData = useCallback(async () => {
        // Si tiene múltiples campañas y no ha seleccionado una, no cargar
        if (campanas.length > 1 && !campanaSeleccionada) {
            setRows([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const params = {
                page,
                page_size: pageSize,
                fecha_desde: fechaInicio || undefined,
                fecha_hasta: fechaFin || undefined,
            };

            // Agregar campaña si está seleccionada
            if (campanaSeleccionada) {
                params.campana_id = campanaSeleccionada;
            }

            // Filtro por agente
            if (agenteNombre.trim()) {
                params.agente_nombre = agenteNombre.trim();
            }

            // Filtro por teléfono
            if (telefono.trim()) {
                params.telefono = telefono.trim();
            }

            // Filtro por estado (contestada/no contestada)
            if (estadoFiltro === "contestada") {
                params.fue_contestada = true;
            } else if (estadoFiltro === "no_contestada") {
                params.fue_contestada = false;
            }

            const payload = await historialJefeService.getHistorial(params);

            setRows(payload.results || []);
            setTotalPages(payload.total_pages || 0);
            setTotalCount(payload.count || 0);
        } catch (e) {
            console.error("Error cargando historial:", e);
            setError("No se pudo cargar el historial de llamadas");
        } finally {
            setLoading(false);
        }
    }, [campanaSeleccionada, page, agenteNombre, telefono, estadoFiltro, fechaInicio, fechaFin, campanas.length]);

    // Cargar datos cuando cambian los filtros
    useEffect(() => {
        if (!loadingCampanas) {
            fetchData();
        }
    }, [fetchData, loadingCampanas]);

    // ======================== Handlers ========================
    const handleAgenteChange = (e) => {
        const value = e.target.value;
        setAgenteNombre(value);
        setPage(1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchData, 400);
    };

    const handleTelefonoChange = (e) => {
        const value = e.target.value;
        setTelefono(value);
        setPage(1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchData, 400);
    };

    const handleCampanaChange = (e) => {
        setCampanaSeleccionada(e.target.value);
        setPage(1);
    };

    const handleEstadoChange = (e) => {
        setEstadoFiltro(e.target.value);
        setPage(1);
    };

    const handlePageChange = (event, newPage) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const toggleRow = (id) => setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));

    const limpiarFiltros = () => {
        setAgenteNombre("");
        setTelefono("");
        setEstadoFiltro("todos");
        setFechaInicio(today);
        setFechaFin(today);
        setPage(1);
        setSnack("Filtros restablecidos");
    };

    // ======================== Render Selector de Campaña ========================
    const renderSelectorCampana = () => {
        if (loadingCampanas) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (campanas.length === 0) {
            return (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    No tienes campañas asignadas. Contacta al administrador.
                </Alert>
            );
        }

        // Si tiene solo una campaña, mostrar el nombre en un Card
        if (campanas.length === 1) {
            return (
                <Card sx={(t) => ({ ...cardSx(t), mb: 2 })}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <FilterAltIcon color="primary" />
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Campaña activa
                                </Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {campanas[0].nombre}
                                </Typography>
                                {campanas[0].descripcion && (
                                    <Typography variant="body2" color="text.secondary">
                                        {campanas[0].descripcion}
                                    </Typography>
                                )}
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            );
        }

        // Si tiene múltiples campañas, mostrar selector
        return (
            <Paper variant="outlined" sx={(t) => ({ ...cardSx(t), mb: 2, width: 'fit-content' })}>
                <Box sx={{ width: 400 }}>
                    <FormControl fullWidth>
                        <InputLabel id="campana-label">Selecciona una campaña</InputLabel>
                        <Select
                            labelId="campana-label"
                            value={campanaSeleccionada}
                            label="Selecciona una campaña"
                            onChange={handleCampanaChange}
                            sx={{
                                "& .MuiOutlinedInput-root": (t) => ({
                                    borderRadius: "14px",
                                    backgroundColor:
                                        t.palette.mode === "light" ? "#F5F7FA" : "rgba(255,255,255,0.06)",
                                }),
                            }}
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
                </Box>
            </Paper>
        );
    };

    // ======================== Render ========================
    return (
        <MainLayout title="Historial de Llamadas">
            <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                {/* Header */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="h5" fontWeight={800}>
                        Historial de Llamadas
                    </Typography>
                    <RefreshCircle onClick={fetchData} loading={loading} />
                </Stack>

                {/* Selector de Campaña */}
                {renderSelectorCampana()}

                {/* Mostrar filtros solo si hay campaña seleccionada o solo hay una */}
                {(campanaSeleccionada || campanas.length === 1) && (
                    <>
                        {/* Filtros */}
                        <Paper variant="outlined" sx={(t) => cardSx(t)}>
                            <Grid container spacing={2}>
                                {/* Buscar por Agente */}
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        placeholder="Buscar por agente"
                                        value={agenteNombre}
                                        onChange={handleAgenteChange}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <PersonIcon />
                                                </InputAdornment>
                                            ),
                                            endAdornment: agenteNombre && (
                                                <InputAdornment position="end">
                                                    <IconButton size="small" onClick={() => { setAgenteNombre(""); setPage(1); }}>
                                                        <ClearIcon />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            "& .MuiOutlinedInput-root": (t) => ({
                                                borderRadius: "14px",
                                                backgroundColor:
                                                    t.palette.mode === "light" ? "#F5F7FA" : "rgba(255,255,255,0.06)",
                                                "& fieldset": {
                                                    borderColor:
                                                        t.palette.mode === "light"
                                                            ? "rgba(12,21,90,0.16)"
                                                            : "rgba(255,255,255,0.18)",
                                                    borderWidth: 2,
                                                },
                                                "&:hover fieldset": { borderColor: t.palette.primary.main },
                                                "&.Mui-focused fieldset": { borderColor: t.palette.primary.main },
                                                height: 44,
                                            }),
                                        }}
                                    />
                                </Grid>

                                {/* Buscar por Teléfono */}
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        placeholder="Buscar por teléfono"
                                        value={telefono}
                                        onChange={handleTelefonoChange}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <PhoneIcon />
                                                </InputAdornment>
                                            ),
                                            endAdornment: telefono && (
                                                <InputAdornment position="end">
                                                    <IconButton size="small" onClick={() => { setTelefono(""); setPage(1); }}>
                                                        <ClearIcon />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            "& .MuiOutlinedInput-root": (t) => ({
                                                borderRadius: "14px",
                                                backgroundColor:
                                                    t.palette.mode === "light" ? "#F5F7FA" : "rgba(255,255,255,0.06)",
                                                "& fieldset": {
                                                    borderColor:
                                                        t.palette.mode === "light"
                                                            ? "rgba(12,21,90,0.16)"
                                                            : "rgba(255,255,255,0.18)",
                                                    borderWidth: 2,
                                                },
                                                "&:hover fieldset": { borderColor: t.palette.primary.main },
                                                "&.Mui-focused fieldset": { borderColor: t.palette.primary.main },
                                                height: 44,
                                            }),
                                        }}
                                    />
                                </Grid>

                                {/* Estado */}
                                <Grid item xs={12} md={2}>
                                    <FormControl fullWidth>
                                        <InputLabel id="estado-label">Estado</InputLabel>
                                        <Select
                                            labelId="estado-label"
                                            value={estadoFiltro}
                                            label="Estado"
                                            onChange={handleEstadoChange}
                                            sx={{
                                                "& .MuiOutlinedInput-root": (t) => ({
                                                    borderRadius: "14px",
                                                    backgroundColor:
                                                        t.palette.mode === "light" ? "#F5F7FA" : "rgba(255,255,255,0.06)",
                                                }),
                                                height: 44,
                                            }}
                                        >
                                            <MenuItem value="todos">Todos</MenuItem>
                                            <MenuItem value="contestada">Contestada</MenuItem>
                                            <MenuItem value="no_contestada">No contestada</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                {/* Fecha Desde */}
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        label="Desde"
                                        type="date"
                                        size="small"
                                        value={fechaInicio}
                                        onChange={(e) => {
                                            setFechaInicio(e.target.value);
                                            setPage(1);
                                        }}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{
                                            "& .MuiOutlinedInput-root": (t) => ({
                                                borderRadius: "14px",
                                                backgroundColor:
                                                    t.palette.mode === "light" ? "#F5F7FA" : "rgba(255,255,255,0.06)",
                                                height: 44,
                                            }),
                                        }}
                                    />
                                </Grid>

                                {/* Fecha Hasta */}
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        label="Hasta"
                                        type="date"
                                        size="small"
                                        value={fechaFin}
                                        onChange={(e) => {
                                            setFechaFin(e.target.value);
                                            setPage(1);
                                        }}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{
                                            "& .MuiOutlinedInput-root": (t) => ({
                                                borderRadius: "14px",
                                                backgroundColor:
                                                    t.palette.mode === "light" ? "#F5F7FA" : "rgba(255,255,255,0.06)",
                                                height: 44,
                                            }),
                                        }}
                                    />
                                </Grid>

                                {/* Botón Limpiar */}
                                <Grid item xs={12} md={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
                                    <Button variant="outlined" onClick={limpiarFiltros} sx={{ fontWeight: 700 }}>
                                        Limpiar Filtros
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Tabla */}
                        <Paper variant="outlined" sx={(t) => ({ ...cardSx(t), mb: 2, p: 0, overflow: "hidden" })}>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow
                                            sx={(t) => ({
                                                backgroundColor:
                                                    t.palette.mode === "light" ? "#EBF5FE" : "rgba(255,255,255,0.05)",
                                            })}
                                        >
                                            <TableCell
                                                sx={(t) => ({
                                                    fontWeight: 700,
                                                    fontSize: "0.9rem",
                                                    color: t.palette.text.primary,
                                                    borderBottom: `2px solid ${t.palette.primary.main}`,
                                                    py: 2,
                                                    textAlign: "center",
                                                })}
                                            >
                                                Cliente / Teléfono
                                            </TableCell>
                                            <TableCell
                                                sx={(t) => ({
                                                    fontWeight: 700,
                                                    fontSize: "0.9rem",
                                                    color: t.palette.text.primary,
                                                    borderBottom: `2px solid ${t.palette.primary.main}`,
                                                    py: 2,
                                                    textAlign: "center",
                                                })}
                                            >
                                                Agente
                                            </TableCell>
                                            <TableCell
                                                sx={(t) => ({
                                                    fontWeight: 700,
                                                    fontSize: "0.9rem",
                                                    color: t.palette.text.primary,
                                                    borderBottom: `2px solid ${t.palette.primary.main}`,
                                                    py: 2,
                                                    textAlign: "center",
                                                })}
                                            >
                                                Fecha y hora
                                            </TableCell>
                                            <TableCell
                                                sx={(t) => ({
                                                    fontWeight: 700,
                                                    fontSize: "0.9rem",
                                                    color: t.palette.text.primary,
                                                    borderBottom: `2px solid ${t.palette.primary.main}`,
                                                    py: 2,
                                                    textAlign: "center",
                                                })}
                                            >
                                                Duración
                                            </TableCell>
                                            <TableCell
                                                sx={(t) => ({
                                                    fontWeight: 700,
                                                    fontSize: "0.9rem",
                                                    color: t.palette.text.primary,
                                                    borderBottom: `2px solid ${t.palette.primary.main}`,
                                                    py: 2,
                                                    textAlign: "center",
                                                })}
                                            >
                                                Estado
                                            </TableCell>
                                            <TableCell
                                                sx={(t) => ({
                                                    fontWeight: 700,
                                                    fontSize: "0.9rem",
                                                    color: t.palette.text.primary,
                                                    borderBottom: `2px solid ${t.palette.primary.main}`,
                                                    py: 2,
                                                    textAlign: "center",
                                                })}
                                            >
                                                Venta
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loading && (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center">
                                                    <Stack
                                                        direction="row"
                                                        spacing={1}
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        sx={{ py: 2 }}
                                                    >
                                                        <CircularProgress size={20} />
                                                        <Typography variant="body2">Cargando historial...</Typography>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {!loading && rows.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6}>
                                                    <Alert severity="info">
                                                        No se encontraron llamadas con los filtros seleccionados.
                                                    </Alert>
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {!loading &&
                                            rows.map((row, index) => {
                                                const chip = estadoToChip(row.fue_contestada);
                                                const id = row.id;
                                                const isOpen = !!openRows[id];

                                                return (
                                                    <React.Fragment key={id}>
                                                        <TableRow
                                                            hover
                                                            onClick={() => toggleRow(id)}
                                                            sx={(t) => ({
                                                                cursor: "pointer",
                                                                "&:hover": {
                                                                    backgroundColor:
                                                                        t.palette.mode === "light"
                                                                            ? "#F8FBFF"
                                                                            : "rgba(255, 255, 255, 0.05)",
                                                                },
                                                                backgroundColor:
                                                                    t.palette.mode === "light"
                                                                        ? index % 2 === 0
                                                                            ? "white"
                                                                            : "#FAFCFE"
                                                                        : index % 2 === 0
                                                                            ? "transparent"
                                                                            : "rgba(255, 255, 255, 0.02)",
                                                                transition: "background-color 0.2s ease",
                                                            })}
                                                        >
                                                            {/* Cliente / Teléfono */}
                                                            <TableCell
                                                                sx={(t) => ({
                                                                    color: t.palette.text.primary,
                                                                    fontWeight: 600,
                                                                    fontSize: "0.85rem",
                                                                    borderBottom:
                                                                        t.palette.mode === "light"
                                                                            ? "1px solid rgba(12, 21, 90, 0.1)"
                                                                            : "1px solid rgba(255, 255, 255, 0.1)",
                                                                    textAlign: "center",
                                                                })}
                                                            >
                                                                <Stack spacing={0.3}>
                                                                    <Typography variant="body2" fontWeight={600}>
                                                                        {row.cliente_nombre || "N/A"}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {row.cliente_telefono || row.telefono_destino}
                                                                    </Typography>
                                                                </Stack>
                                                            </TableCell>

                                                            {/* Agente */}
                                                            <TableCell
                                                                sx={(t) => ({
                                                                    color: t.palette.text.primary,
                                                                    fontSize: "0.85rem",
                                                                    borderBottom:
                                                                        t.palette.mode === "light"
                                                                            ? "1px solid rgba(12, 21, 90, 0.1)"
                                                                            : "1px solid rgba(255, 255, 255, 0.1)",
                                                                    textAlign: "center",
                                                                })}
                                                            >
                                                                <Typography variant="body2">{row.agente_nombre || "N/A"}</Typography>
                                                            </TableCell>

                                                            {/* Fecha y hora */}
                                                            <TableCell
                                                                sx={(t) => ({
                                                                    color: t.palette.text.primary,
                                                                    fontSize: "0.85rem",
                                                                    borderBottom:
                                                                        t.palette.mode === "light"
                                                                            ? "1px solid rgba(12, 21, 90, 0.1)"
                                                                            : "1px solid rgba(255, 255, 255, 0.1)",
                                                                    textAlign: "center",
                                                                })}
                                                            >
                                                                <Typography variant="body2">
                                                                    {new Date(row.fecha_hora_inicio).toLocaleString("es-CO", {
                                                                        dateStyle: "short",
                                                                        timeStyle: "short",
                                                                    })}
                                                                </Typography>
                                                            </TableCell>

                                                            {/* Duración */}
                                                            <TableCell
                                                                sx={(t) => ({
                                                                    color: t.palette.text.primary,
                                                                    fontSize: "0.85rem",
                                                                    borderBottom:
                                                                        t.palette.mode === "light"
                                                                            ? "1px solid rgba(12, 21, 90, 0.1)"
                                                                            : "1px solid rgba(255, 255, 255, 0.1)",
                                                                    textAlign: "center",
                                                                })}
                                                            >
                                                                <Typography variant="body2">
                                                                    {formatearDuracion(row.duracion)}
                                                                </Typography>
                                                            </TableCell>

                                                            {/* Estado */}
                                                            <TableCell
                                                                sx={(t) => ({
                                                                    borderBottom:
                                                                        t.palette.mode === "light"
                                                                            ? "1px solid rgba(12, 21, 90, 0.1)"
                                                                            : "1px solid rgba(255, 255, 255, 0.1)",
                                                                    textAlign: "center",
                                                                })}
                                                            >
                                                                <Chip
                                                                    size="small"
                                                                    label={chip.label}
                                                                    color={chip.color}
                                                                    icon={chip.icon}
                                                                />
                                                            </TableCell>

                                                            {/* Venta */}
                                                            <TableCell
                                                                sx={(t) => ({
                                                                    borderBottom:
                                                                        t.palette.mode === "light"
                                                                            ? "1px solid rgba(12, 21, 90, 0.1)"
                                                                            : "1px solid rgba(255, 255, 255, 0.1)",
                                                                    textAlign: "center",
                                                                })}
                                                            >
                                                                {row.hubo_venta ? (
                                                                    <Chip
                                                                        size="small"
                                                                        label="Venta"
                                                                        color="success"
                                                                        icon={<AttachMoneyIcon />}
                                                                    />
                                                                ) : (
                                                                    <Chip size="small" label="Sin venta" color="default" />
                                                                )}
                                                            </TableCell>
                                                        </TableRow>

                                                        {/* Fila expandible con detalles */}
                                                        <TableRow>
                                                            <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                                                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                                                    <Divider />
                                                                    <Box sx={{ p: 3, backgroundColor: (t) => t.palette.mode === 'light' ? '#F9FAFB' : 'rgba(255,255,255,0.02)' }}>
                                                                        <Grid container spacing={3}>
                                                                            {/* Información del Cliente */}
                                                                            <Grid item xs={12} md={4}>
                                                                                <Paper sx={{ p: 2, height: '100%' }}>
                                                                                    <Typography variant="subtitle2" gutterBottom fontWeight={700} color="primary">
                                                                                        <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                                                                        Información del Cliente
                                                                                    </Typography>
                                                                                    <Divider sx={{ my: 1 }} />
                                                                                    <Stack spacing={1}>
                                                                                        <Box>
                                                                                            <Typography variant="caption" color="text.secondary">
                                                                                                Nombre:
                                                                                            </Typography>
                                                                                            <Typography variant="body2" fontWeight={600}>
                                                                                                {row.cliente_nombre || "N/A"}
                                                                                            </Typography>
                                                                                        </Box>
                                                                                        <Box>
                                                                                            <Typography variant="caption" color="text.secondary">
                                                                                                Teléfono:
                                                                                            </Typography>
                                                                                            <Typography variant="body2" fontWeight={600}>
                                                                                                {row.cliente_telefono || row.telefono_destino}
                                                                                            </Typography>
                                                                                        </Box>
                                                                                        {row.cliente_otros_datos && Object.keys(row.cliente_otros_datos).length > 0 && (
                                                                                            <Box>
                                                                                                <Typography variant="caption" color="text.secondary">
                                                                                                    Datos adicionales:
                                                                                                </Typography>
                                                                                                {Object.entries(row.cliente_otros_datos).map(([key, value]) => (
                                                                                                    <Typography key={key} variant="body2">
                                                                                                        <strong>{key}:</strong> {value}
                                                                                                    </Typography>
                                                                                                ))}
                                                                                            </Box>
                                                                                        )}
                                                                                    </Stack>
                                                                                </Paper>
                                                                            </Grid>

                                                                            {/* Información de Venta */}
                                                                            {row.hubo_venta && (
                                                                                <Grid item xs={12} md={4}>
                                                                                    <Paper sx={{ p: 2, height: '100%', backgroundColor: (t) => t.palette.mode === 'light' ? '#E8F5E9' : 'rgba(76, 175, 80, 0.1)' }}>
                                                                                        <Typography variant="subtitle2" gutterBottom fontWeight={700} color="success.main">
                                                                                            <AttachMoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                                                                            Información de Venta
                                                                                        </Typography>
                                                                                        <Divider sx={{ my: 1 }} />
                                                                                        <Stack spacing={1}>
                                                                                            <Box>
                                                                                                <Typography variant="caption" color="text.secondary">
                                                                                                    Estado:
                                                                                                </Typography>
                                                                                                <Typography variant="body2" fontWeight={600}>
                                                                                                    {row.estado_venta_valor || "VENTA"}
                                                                                                </Typography>
                                                                                            </Box>
                                                                                            <Box>
                                                                                                <Typography variant="caption" color="text.secondary">
                                                                                                    Monto:
                                                                                                </Typography>
                                                                                                <Typography variant="h6" fontWeight={700} color="success.main">
                                                                                                    {formatearMonto(row.monto_venta)}
                                                                                                </Typography>
                                                                                            </Box>
                                                                                        </Stack>
                                                                                    </Paper>
                                                                                </Grid>
                                                                            )}   
                                                                        </Grid>
                                                                    </Box>
                                                                </Collapse>
                                                            </TableCell>
                                                        </TableRow>
                                                    </React.Fragment>
                                                );
                                            })}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Paginación */}
                            {!loading && rows.length > 0 && (
                                <Box
                                    sx={(t) => ({
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        p: 2,
                                        backgroundColor: t.palette.background.paper,
                                        borderRadius: "0 0 9px 9px",
                                    })}
                                >
                                    <Typography variant="body2" color="text.secondary">
                                        Mostrando {rows.length} de {totalCount} llamadas
                                    </Typography>
                                    <Pagination
                                        count={totalPages}
                                        page={page}
                                        onChange={handlePageChange}
                                        color="primary"
                                        shape="rounded"
                                        size="medium"
                                    />
                                </Box>
                            )}
                        </Paper>

                        {/* Pie */}
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            sx={{ mt: 1 }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                Total: {totalCount} llamadas | Página {page} de {totalPages}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Actualización manual
                            </Typography>
                        </Stack>
                    </>
                )}

                {error && (
                    <Box sx={{ mt: 2 }}>
                        <Alert severity="error">{error}</Alert>
                    </Box>
                )}

                <Snackbar
                    open={!!snack}
                    autoHideDuration={2200}
                    onClose={() => setSnack(null)}
                    message={snack}
                />
            </Box>
        </MainLayout>
    );
}
