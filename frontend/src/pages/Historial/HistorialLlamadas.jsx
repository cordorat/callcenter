// Path: src/pages/Historial/HistorialLlamadas.jsx
// -----------------------------------------------------------------------------
// Historial de llamadas (React + MUI, con soporte modo claro/oscuro)
// Funcionalidad:
// - Filtros: búsqueda (q), estado, rango de fechas (desde/hasta).
// - Auto-refresh opcional (autoRefreshMs).
// - Fila clickeable para ver detalle (sin icono).
// - Botón de recarga circular.
// Backend:
// - Ajusta buildUrl() si tu endpoint difiere de /api/llamadas.
// - Envía agent_id si tu API lo requiere o elimínalo si se infiere por token.
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { useAuth } from "@/core/context/AuthContext";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

const formatearDuracion = (seg) => {
  if (!seg || seg <= 0) return "0s";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
const estadoToChip = (estado) => {
  const map = {
    contestada: { label: "Contestada", color: "success" },
    no_contestada: { label: "No contestada", color: "warning" },
    fallida: { label: "Fallida", color: "error" },
  };
  return map[estado] || { label: estado || "N/A", color: "default" };
};
const toYMD = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
};

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

export default function HistorialLlamadas({
  apiBaseUrl,
  autoRefreshMs = 15000,
}) {
  const { user } = useAuth();
  const API = apiBaseUrl || import.meta?.env?.VITE_API_BASE_URL || window.location.origin;

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
  const debounceRef = useRef(null);

  const buildUrl = useCallback(() => {
    const base = API.endsWith("/") ? API.slice(0, -1) : API;
    const url = new URL(`${base}/api/llamadas`, window.location.origin);
    if (q) url.searchParams.set("q", q.trim());
    if (estado && estado !== "todos") url.searchParams.set("estado", estado);
    if (fechaInicio) url.searchParams.set("start", fechaInicio);
    if (fechaFin) url.searchParams.set("end", fechaFin);
    if (user?.id) url.searchParams.set("agent_id", String(user.id));
    return url.toString();
  }, [API, q, estado, fechaInicio, fechaFin, user?.id]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildUrl(), { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const list = Array.isArray(payload) ? payload : payload.results || [];
      list.sort((a, b) => new Date(b.fecha_hora_inicio) - new Date(a.fecha_hora_inicio));
      setRows(list);
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar el historial de llamadas, intente nuevamente más tarde.");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!autoRefreshMs) return;
    const id = setInterval(fetchData, autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefreshMs, fetchData]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchData, 400);
  };

  const toggleRow = (id) => setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));
  const total = useMemo(() => rows.length, [rows]);

  return (
    <MainLayout title="Historial de llamadas">
      <Box sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={800}></Typography>
          <RefreshCircle onClick={fetchData} loading={loading} />
        </Stack>

        <Paper variant="outlined" sx={(t) => cardSx(t)}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
            {/* Búsqueda con mismo estilo que fechas */}
            <TextField
              fullWidth
              placeholder="Buscar por teléfono o nombre del cliente"
              value={q}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
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
                  borderRadius: "14px",
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

            {/* Filtro Estado con mismo estilo que fechas */}
            <FormControl
              sx={{
                minWidth: 190,
                "& .MuiOutlinedInput-root": (t) => ({
                  borderRadius: "14px",
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
                onChange={(e) => { setEstado(e.target.value); fetchData(); }}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="contestada">Contestada</MenuItem>
                <MenuItem value="no_contestada">No contestada</MenuItem>
                <MenuItem value="fallida">Fallida</MenuItem>
              </Select>
            </FormControl>

            {/* fecha desde (gris claro en modo claro) */}
            <TextField
              label="Desde"
              type="date"
              size="small"
              value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); fetchData(); }}
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
                  borderRadius: "14px",
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
                "& input": { paddingY: 1.2 },
              }}
            />

            {/* fecha hasta (gris claro en modo claro) */}
            <TextField
              label="Hasta"
              type="date"
              size="small"
              value={fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); fetchData(); }}
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
                  borderRadius: "14px",
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
                "& input": { paddingY: 1.2 },
              }}
            />

            <Button
              variant="text"
              onClick={() => {
                setQ("");
                setEstado("todos");
                setFechaInicio(today);
                setFechaFin(today);
                setSnack("Filtros restablecidos");
                fetchData();
              }}
              sx={{
                fontWeight: 700,
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#FFFFFF" : theme.palette.primary.dark,
              }}
            >
              LIMPIAR
            </Button>
          </Stack>
        </Paper>

        <TableContainer component={Paper} variant="outlined" sx={(t) => ({ ...cardSx(t), mb: 1 })}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cliente / Teléfono</TableCell>
                <TableCell>Fecha y hora</TableCell>
                <TableCell>Duración</TableCell>
                <TableCell>Estado</TableCell>
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
                rows.map((row) => {
                  const chip = estadoToChip(row.estado_llamada);
                  const id = row.id;
                  const isOpen = !!openRows[id];
                  return (
                    <React.Fragment key={id}>
                      <TableRow
                        hover
                        onClick={() => toggleRow(id)}
                        sx={(t) => ({
                          cursor: "pointer",
                          backgroundColor: isOpen
                            ? t.palette.mode === "light"
                              ? "rgba(12,21,90,0.04)"
                              : "rgba(255,255,255,0.05)"
                            : "inherit",
                          "&:hover": {
                            backgroundColor:
                              t.palette.mode === "light"
                                ? "rgba(12,21,90,0.08)"
                                : "rgba(255,255,255,0.08)",
                          },
                        })}
                      >
                        <TableCell>
                          <Stack spacing={0.3}>
                            <Typography variant="body2" fontWeight={600}>
                              {row?.cliente?.nombre || row?.cliente?.documento || row.telefono_destino || "N/A"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row?.cliente?.telefono || row.telefono_destino}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(row.fecha_hora_inicio).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatearDuracion(row.duracion)}</Typography>
                        </TableCell>
                        <TableCell>
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
                                  <Typography variant="subtitle2" gutterBottom>Información del cliente</Typography>
                                  <Typography variant="body2">Nombre: {row?.cliente?.nombre || "N/A"}</Typography>
                                  <Typography variant="body2">Documento: {row?.cliente?.documento || "N/A"}</Typography>
                                  <Typography variant="body2">Teléfono: {row?.cliente?.telefono || row.telefono_destino || "N/A"}</Typography>
                                </Box>
                                <Box sx={{ minWidth: 240 }}>
                                  <Typography variant="subtitle2" gutterBottom>Resultado</Typography>
                                  <Typography variant="body2">{row?.resultado || row?.estado_venta || "Sin resultado registrado"}</Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle2" gutterBottom>Notas / Transcripción</Typography>
                                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                    {row?.transcipcion || "Sin notas"}
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

        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">Total: {total} llamadas</Typography>
          <Typography variant="caption" color="text.secondary">
            {autoRefreshMs ? `Actualiza cada ${Math.round(autoRefreshMs / 1000)}s` : "Actualización manual"}
          </Typography>
        </Stack>

        {error && <Box sx={{ mt: 2 }}><Alert severity="error">{error}</Alert></Box>}
        <Snackbar open={!!snack} autoHideDuration={2200} onClose={() => setSnack(null)} message={snack} />
      </Box>
    </MainLayout>
  );
}
