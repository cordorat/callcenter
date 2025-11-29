// PATH: src/pages/Historial/HistorialLlamadas.jsx
// -----------------------------------------------------------------------------
// Historial de llamadas - Dispatcher por rol
// - AGENTE: Ve solo sus propias llamadas
// - JEFE_CAMPAÑA: Ve todas las llamadas de sus campañas
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/core/context/AuthContext";
import HistorialJefeCampana from "./HistorialJefeCampana";
import MainLayout from "@/core/components/layout/MainLayout";
import { callsService } from "@/core/api/calls";

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
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

// ======================== Utilidades ========================
const formatearDuracion = (seg) => {
  if (!seg || seg <= 0) return "0s";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const estadoToChip = (fueContestada, estado) => {
  // Primero verificar si fue contestada (campo booleano de la BD)
  if (fueContestada === true) {
    return { label: "Contestada", color: "success" };
  }
  
  // Si no fue contestada, mostrar el motivo según estado_llamada
  const map = {
    NO_CONTESTADA: { label: "No contestada", color: "warning" },
    RECHAZADA: { label: "Rechazada", color: "default" },
    COLGADA: { label: "Colgada", color: "error" },
    OCUPADO: { label: "Ocupado", color: "warning" },
    ERROR: { label: "Error", color: "error" },
    TIMBRADO: { label: "Timbrando", color: "info" },
    COMPLETADA: { label: "No contestada", color: "warning" }, // Completada pero no contestada
    EN_CURSO: { label: "En curso", color: "primary" },
    TRANSFERIDA: { label: "Transferida", color: "info" },
  };
  return map[estado] || { label: estado || "Sin respuesta", color: "default" };
};

const toYMD = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
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
function HistorialAgente() {
  const { user } = useAuth();
  const today = toYMD(new Date());

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");
  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);

  const [rows, setRows] = useState([]);
  const [openRows, setOpenRows] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(6);
  const debounceRef = useRef(null);

  // ======================== Fetch Data ========================
  const fetchData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

    const trimmed = q.trim();
    const isNumber = /^[\d\s\+\-]+$/.test(trimmed);

    // Construir parámetros base
    const params = {
      fecha_desde: fechaInicio || undefined,
      fecha_hasta: fechaFin || undefined,
      page: 1,
      page_size: 50,
    };

    // Agregar búsqueda por teléfono o cliente
    if (trimmed) {
      if (isNumber) {
        params.telefono = trimmed;
      } else {
        params.cliente = trimmed;
      }
    }

    // Manejar filtro de estado
    if (estado === 'contestada') {
      // Filtrar por fue_contestada=true
      params.fue_contestada = true;
    } else if (estado === 'no_contestada') {
      // Filtrar por fue_contestada=false (llamadas completadas pero no contestadas)
      params.fue_contestada = false;
    } else if (estado !== 'todos') {
      // Filtrar por estado específico (RECHAZADA, COLGADA, etc.)
      params.estado = estado.toUpperCase();
    }

    const payload = await callsService.getHistory(params);

    const list = Array.isArray(payload) ? payload : payload.results || [];
    list.sort((a, b) => new Date(b.fecha_hora_inicio) - new Date(a.fecha_hora_inicio));
    setRows(list);
  } catch (e) {
    console.error(e);
    setError("No se pudo cargar el historial de llamadas, intente nuevamente más tarde.");
  } finally {
    setLoading(false);
  }
}, [q, estado, fechaInicio, fechaFin]);


  // Cargar datos solo al montar el componente o cuando cambian los filtros
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQ(value);
    setPage(0); // Reset a página 0 al buscar
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchData, 400);
  };

  const toggleRow = (id) => setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));
  const total = useMemo(() => rows.length, [rows]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Obtener solo los registros de la página actual
  const paginatedRows = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return rows.slice(startIndex, startIndex + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  // ======================== Render ========================
  return (
    <MainLayout title="Historial de llamadas">
      <Box sx={{ p: { xs: 1.5, md: 2 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={800}></Typography>
          <RefreshCircle onClick={fetchData} loading={loading} />
        </Stack>

        {/* Filtros */}
        <Paper variant="outlined" sx={(t) => cardSx(t)}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            {/* Buscar */}
            <TextField
              fullWidth
              placeholder="Buscar por teléfono o nombre del cliente"
              value={q}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {q && (
                      <IconButton size="small" onClick={() => { setQ(""); fetchData(); }}>
                        <ClearIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": (t) => ({
                  borderRadius: "8px",
                  backgroundColor:
                    t.palette.mode === "light" ? "#F5F7FA" : "rgba(255,255,255,0.06)",
                  "& fieldset": {
                    borderColor:
                      t.palette.mode === "light" ? "rgba(12,21,90,0.16)" : "rgba(255,255,255,0.18)",
                    borderWidth: 2,
                  },
                  "&:hover fieldset": { borderColor: t.palette.primary.main },
                  "&.Mui-focused fieldset": { borderColor: t.palette.primary.main },
                  height: 44,
                }),
              }}
            />

            {/* Estado */}
            <FormControl
              sx={{
                minWidth: 190,
                "& .MuiOutlinedInput-root": (t) => ({
                  borderRadius: "8px",
                  backgroundColor:
                    t.palette.mode === "light" ? "#F5F7FA" : "rgba(255,255,255,0.06)",
                  "& fieldset": {
                    borderColor:
                      t.palette.mode === "light" ? "rgba(12,21,90,0.16)" : "rgba(255,255,255,0.18)",
                    borderWidth: 2,
                  },
                  "&:hover fieldset": { borderColor: t.palette.primary.main },
                  "&.Mui-focused fieldset": { borderColor: t.palette.primary.main },
                  height: 44,
                }),
              }}
            >
              <InputLabel
                id="estado-label"
                sx={(theme) => ({
                  color: theme.palette.mode === "dark" ? "#FFFFFF" : undefined,
                  fontWeight: 700,
                })}
              >
                <FilterAltIcon fontSize="small" sx={{ mr: 1 }} /> Estado
              </InputLabel>
              <Select
                labelId="estado-label"
                value={estado}
                label="Estado"
                onChange={(e) => { 
                  setEstado(e.target.value); 
                  setPage(0);
                }}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="contestada">Contestada</MenuItem>
                <MenuItem value="no_contestada">No contestada</MenuItem>
                <MenuItem value="rechazada">Rechazada</MenuItem>
                <MenuItem value="colgada">Colgada</MenuItem>
                <MenuItem value="ocupado">Ocupado</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>

            {/* Fechas */}
            {["Desde", "Hasta"].map((label, i) => (
              <TextField
                key={label}
                label={label}
                type="date"
                size="small"
                value={i === 0 ? fechaInicio : fechaFin}
                onChange={(e) => {
                  if (i === 0) setFechaInicio(e.target.value);
                  else setFechaFin(e.target.value);
                  setPage(0);
                }}
                onBlur={fetchData}
                InputLabelProps={{
                  shrink: true,
                  sx: (theme) => ({
                    color: theme.palette.mode === "dark" ? "#FFFFFF" : theme.palette.primary.dark,
                    fontWeight: 700,
                  }),
                }}
                sx={{
                  minWidth: 190,
                  "& .MuiOutlinedInput-root": (t) => ({
                    borderRadius: "8px",
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
                  "& input": { paddingY: 1.2 },
                }}
              />
            ))}

            <Button
              variant="outlined"
              onClick={() => {
                setQ("");
                setEstado("todos");
                setFechaInicio(today);
                setFechaFin(today);
                setPage(0);
                setSnack("Filtros restablecidos");
                fetchData();
              }}
              sx={{
                fontWeight: 700,
              }}
            >
              LIMPIAR
            </Button>
          </Stack>
        </Paper>

        {/* Tabla */}
        <Paper variant="outlined" sx={(t) => ({ ...cardSx(t), mb: 2, p: 0, overflow: 'hidden' })}>
          <TableContainer>
            <Table size="small">
            <TableHead>
              <TableRow sx={(t) => ({ backgroundColor: t.palette.mode === 'light' ? '#EBF5FE' : 'rgba(255,255,255,0.05)' })}>
                <TableCell sx={(t) => ({ fontWeight: 700, fontSize: '0.9rem', color: t.palette.text.primary, borderBottom: `2px solid ${t.palette.primary.main}`, py: 2, textAlign: 'center' })}>Cliente / Teléfono</TableCell>
                <TableCell sx={(t) => ({ fontWeight: 700, fontSize: '0.9rem', color: t.palette.text.primary, borderBottom: `2px solid ${t.palette.primary.main}`, py: 2, textAlign: 'center' })}>Fecha y hora</TableCell>
                <TableCell sx={(t) => ({ fontWeight: 700, fontSize: '0.9rem', color: t.palette.text.primary, borderBottom: `2px solid ${t.palette.primary.main}`, py: 2, textAlign: 'center' })}>Duración</TableCell>
                <TableCell sx={(t) => ({ fontWeight: 700, fontSize: '0.9rem', color: t.palette.text.primary, borderBottom: `2px solid ${t.palette.primary.main}`, py: 2, textAlign: 'center' })}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">Cargando historial...</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Alert severity="info">No se encontraron llamadas en este rango de tiempo.</Alert>
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                paginatedRows.map((row, index) => {
                  const chip = estadoToChip(row.fue_contestada, row.estado_llamada_valor);
                  const id = row.id;
                  const isOpen = !!openRows[id];
                  return (
                    <React.Fragment key={id}>
                      <TableRow
                        hover
                        onClick={() => toggleRow(id)}
                        sx={(t) => ({
                          cursor: "pointer",
                          '&:hover': {
                            backgroundColor: t.palette.mode === 'light' ? '#F8FBFF' : 'rgba(255, 255, 255, 0.05)',
                          },
                          backgroundColor: t.palette.mode === 'light'
                            ? (index % 2 === 0 ? 'white' : '#FAFCFE')
                            : (index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'),
                          transition: 'background-color 0.2s ease',
                        })}
                      >
                        <TableCell sx={(t) => ({ color: t.palette.text.primary, fontWeight: 600, fontSize: '0.85rem', borderBottom: t.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' })}>
                          <Stack spacing={0.3}>
                            <Typography variant="body2" fontWeight={600}>
                              {row.cliente_nombre || row.telefono_destino || "N/A"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.cliente_telefono || row.telefono_destino}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={(t) => ({ color: t.palette.text.primary, fontSize: '0.85rem', borderBottom: t.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' })}>
                          <Typography variant="body2">
                            {new Date(row.fecha_hora_inicio).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell sx={(t) => ({ color: t.palette.text.primary, fontSize: '0.85rem', borderBottom: t.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' })}>
                          <Typography variant="body2">{formatearDuracion(row.duracion)}</Typography>
                        </TableCell>
                        <TableCell sx={(t) => ({ borderBottom: t.palette.mode === 'light' ? '1px solid rgba(12, 21, 90, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' })}>
                          <Chip size="small" label={chip.label} color={chip.color} />
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isOpen} timeout="auto" unmountOnExit>
                            <Divider />
                            <Box sx={{ p: 2 }}>
                              <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                                <Box sx={{ minWidth: 240 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Información del cliente
                                  </Typography>
                                  <Typography variant="body2">
                                    Nombre: {row.cliente_nombre || "N/A"}
                                  </Typography>
                                  <Typography variant="body2">
                                    Teléfono: {row.cliente_telefono || "N/A"}
                                  </Typography>
                                </Box>
                                <Box sx={{ minWidth: 240 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Resultado
                                  </Typography>
                                  <Typography variant="body2">
                                    {row.resultado_llamada?.estado_llamada ||
                                      row.estado_llamada_valor ||
                                      "Sin resultado"}
                                  </Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Notas / Transcripción
                                  </Typography>
                                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                    {row.notas?.[0]?.contenido || "Sin notas"}
                                  </Typography>
                                </Box>
                              </Stack>
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
          <Box sx={(t) => ({ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            p: 2,
            backgroundColor: t.palette.background.paper,
            borderRadius: '0 0 9px 9px',
          })}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {paginatedRows.length} de {total} llamadas
            </Typography>
            <Pagination
              count={Math.ceil(total / rowsPerPage)}
              page={page + 1}
              onChange={(event, value) => handleChangePage(event, value - 1)}
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
            Total: {total} llamadas
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Actualización manual
          </Typography>
        </Stack>

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

// ======================== Dispatcher por rol ========================
export default function HistorialLlamadas() {
  const { user } = useAuth();

  // Determinar qué componente renderizar según el rol
  // Verificar ambos formatos por compatibilidad
  const rolUsuario = user?.rol?.valor || user?.role;
  
  if (rolUsuario === "JEFE_CAMPANA" || rolUsuario === "JEFE_CAMPAÑA") {
    return <HistorialJefeCampana />;
  }

  // Por defecto, mostrar historial de agente
  return <HistorialAgente />;
}
