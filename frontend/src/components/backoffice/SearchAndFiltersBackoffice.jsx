import {
  Box,
  Stack,
  Paper,
  TextField,
  IconButton,
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
    <Box sx={{ mb: 1 }}>

      <Paper variant="outlined" sx={(t) => cardSx(t)}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={4}
            alignItems={{ xs: "stretch", md: "center" }}
            sx={{ flex: 1 }}
          >
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel
                id="estado-reportada-label"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  backgroundColor:
                    theme.palette.mode === "light" ? "#FFFFFF" : "rgba(255,255,255,0.04)",
                  px: 0.5,
                  zIndex: 1,
                }}
              >
                <FilterAltIcon fontSize="small" sx={{ mr: 1 }} /> Estado Reportada
              </InputLabel>
              <Select
                labelId="estado-reportada-label"
                value={estadoReportada}
                label="Estado Reportada"
                variant="outlined"
                displayEmpty
                onChange={(e) => setEstadoReportada(e.target.value)}
                renderValue={(selected) => {
                  if (selected === "") return "Todos";
                  if (selected === "NO_REPORTADA") return "No reportada";
                  if (selected === "REPORTADA") return "Reportada";
                  return selected;
                }}
                sx={{
                  borderRadius: "14px"
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="NO_REPORTADA">No reportada</MenuItem>
                <MenuItem value="REPORTADA">Reportada</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 190 }}>
              <InputLabel
                id="estado-auditada-label"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  backgroundColor:
                    theme.palette.mode === "light" ? "#FFFFFF" : "rgba(255,255,255,0.04)",
                  px: 0.5,
                  zIndex: 1,
                }}
              >
                <FilterAltIcon fontSize="small" sx={{ mr: 1 }} /> Estado Auditoría
              </InputLabel>
              <Select
                labelId="estado-auditada-label"
                value={estadoAuditada}
                label="Estado Auditoría"
                variant="outlined"
                displayEmpty
                onChange={(e) => setEstadoAuditada(e.target.value)}
                renderValue={(selected) => {
                  if (selected === "") return "Todos";
                  if (selected === "NO_AUDITADA") return "No auditada";
                  if (selected === "AUDITADA") return "Auditada";
                  return selected;
                }}
                sx={{
                  borderRadius: "14px"
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="NO_AUDITADA">No auditada</MenuItem>
                <MenuItem value="AUDITADA">Auditada</MenuItem>
              </Select>
            </FormControl>

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
                InputLabelProps={{ shrink: true }}
                sx={{
                  minWidth: 190,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
                    backgroundColor:
                      theme.palette.mode === "light" ? "#F5F7FA" : "rgba(255,255,255,0.06)",
                    "& fieldset": {
                      borderColor:
                        theme.palette.mode === "light"
                          ? "rgba(12,21,90,0.16)"
                          : "rgba(255,255,255,0.18)",
                      borderWidth: 2,
                    },
                    "&:hover fieldset": { borderColor: theme.palette.primary.main },
                    "&.Mui-focused fieldset": { borderColor: theme.palette.primary.main },
                    height: 44,
                  },
                }}
              />
            ))} 

            <Button 
              variant="text" 
              onClick={onClear}
              sx={{
                fontSize: "1rem",
                fontWeight: 700,
              }}
            >
              LIMPIAR
            </Button>
          </Stack>


          <IconButton onClick={onRefresh} disabled={loading}>
            <ButtonTooltip
              title="Refrescar"
              icon={<RefreshIcon />}
              onClick={onRefresh}
              color="primary"
            />
          </IconButton>
        </Stack>
      </Paper>
    </Box>
  );
}