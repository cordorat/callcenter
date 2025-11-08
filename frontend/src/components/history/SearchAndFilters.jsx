import {
  Box,
  Stack,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTheme } from "@mui/material/styles";
import ButtonTooltip from '@/components/campaing/ButtonTooltip.jsx';
export default function FiltrosyBusqueda({
  busqueda,
  setBusqueda,
  estado,
  setEstado,
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

      <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 1 }}>
        <IconButton onClick={onRefresh} disabled={loading}>
          <ButtonTooltip
            title="Refrescar"
            icon={<RefreshIcon />}
            onClick={onRefresh}
            color="primary"
          />
        </IconButton>
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
            placeholder="Buscar por nombre del agente o número del cliente"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {busqueda && (
                    <IconButton size="small" onClick={() => setBusqueda("")}>
                      <ClearIcon />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
            sx={{
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


          <FormControl sx={{ minWidth: 190 }}>
            <InputLabel
              id="estado-label"
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
              <FilterAltIcon fontSize="small" sx={{ mr: 1 }} /> Estado
            </InputLabel>
            <Select
              labelId="estado-label"
              value={estado}
              label="Estado"
              variant="outlined"
              displayEmpty
              onChange={(e) => setEstado(e.target.value)}
              renderValue={(selected) => {
                if (selected === "") return "Todos";
                if (selected === "COMPLETADA") return "Contestada";
                if (selected === "NO_CONTESTADA") return "No contestada";
                return selected;
              }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="COMPLETADA">Contestada</MenuItem>
              <MenuItem value="NO_CONTESTADA">No contestada</MenuItem>
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

          <Button variant="text" onClick={onClear}>
            LIMPIAR
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}