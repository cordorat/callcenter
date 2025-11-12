import {
  Box,
  Stack,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTheme } from "@mui/material/styles";
import ButtonTooltip from '@/components/campaing/ButtonTooltip.jsx';
export default function FiltrosyBusquedaBackoffice({
  estadoReportada,
  setEstadoReportada,
  estadoAuditada,
  setEstadoAuditada,
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
  onRefresh,
  onClear,
  loading,
}) {
  const theme = useTheme();
  const cardSx = (t) => ({
    p: 2,
    borderRadius: 3,
    borderColor:
      t.palette.mode === "light" ? "rgba(12,21,90,0.16)" : "rgba(255,255,255,0.18)",
    backgroundColor:
      t.palette.mode === "light" ? "#FFFFFF" : "rgba(255,255,255,0.04)",
  });

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "space-between" }}>
        <Paper variant="outlined" sx={(t) => ({ ...cardSx(t), width: "fit-content" })}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            sx={{ p: 2 }}
          >
            {/* Estado Reportada */}
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
                id="estado-reportada-label"
                sx={(theme) => ({
                  color: theme.palette.mode === "dark" ? "#FFFFFF" : undefined,
                  fontWeight: 700,
                })}
              >
                <FilterAltIcon fontSize="small" sx={{ mr: 1 }} /> Estado Reportada
              </InputLabel>
              <Select
                labelId="estado-reportada-label"
                value={estadoReportada}
                label="Estado Reportada"
                onChange={(e) => setEstadoReportada(e.target.value)}
              >
                <MenuItem key="todos-reportada" value="todos">Todos</MenuItem>
                <MenuItem key="no-reportada" value="NO_REPORTADA">No reportada</MenuItem>
                <MenuItem key="reportada" value="REPORTADA">Reportada</MenuItem>
              </Select>
            </FormControl>

            {/* Estado Auditoría */}
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
                id="estado-auditada-label"
                sx={(theme) => ({
                  color: theme.palette.mode === "dark" ? "#FFFFFF" : undefined,
                  fontWeight: 700,
                })}
              >
                <FilterAltIcon fontSize="small" sx={{ mr: 1 }} /> Estado Auditoría
              </InputLabel>
              <Select
                labelId="estado-auditada-label"
                value={estadoAuditada}
                label="Estado Auditoría"
                onChange={(e) => setEstadoAuditada(e.target.value)}
              >
                <MenuItem key="todos-auditada" value="todos">Todos</MenuItem>
                <MenuItem key="no-auditada" value="NO_AUDITADA">No auditada</MenuItem>
                <MenuItem key="auditada" value="AUDITADA">Auditada</MenuItem>
              </Select>
            </FormControl>

            {/* Filtros de fecha */}
            {[
              { label: "Desde", value: fechaInicio, setter: setFechaInicio },
              { label: "Hasta", value: fechaFin, setter: setFechaFin },
            ].map(({ label, value, setter }) => (
              <TextField
                key={label}
                label={label}
                type="date"
                size="small"
                value={value}
                onChange={(e) => setter(e.target.value)}
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
              variant="text"
              onClick={onClear}
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

        {/* Botón Refrescar - Fuera del Paper */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ButtonTooltip
            title="Refrescar"
            icon={<RefreshIcon />}
            onClick={onRefresh}
            color="primary"
            disabled={loading}
          />
        </Box>
      </Box>
    </Box>
  );
}