import React, { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Pagination,
  Chip
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";


const formatearFechaHora = (fechaHoraISO) => {
  if (!fechaHoraISO) return "N/A";
  
  try {
    const fecha = new Date(fechaHoraISO);
    
    // Formatear fecha como YY-MM-DD
    const year = fecha.getFullYear().toString().slice(-4); 
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    
    // Formatear hora como HH:MM
    const hours = String(fecha.getHours()).padStart(2, '0');
    const minutes = String(fecha.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} , ${hours}:${minutes}`;
  } catch (error) {
    return "N/A";
  }
};

const cellBaseSx = (theme) => ({
  color: theme.palette.text.primary,
  fontSize: "0.85rem",
  borderBottom:
    theme.palette.mode === "light"
      ? "1px solid rgba(12, 21, 90, 0.1)"
      : "1px solid rgba(255, 255, 255, 0.1)",
  textAlign: "center",
});

export default function TablaLlamadasBackoffice({
  llamadas = [],
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const getAuditoriaChip = (estado) => {
    if (estado === "AUDITADA")
      return (
        <Chip 
          label="Auditada" 
          size="small" 
          sx={{
            backgroundColor: theme.palette.success.main,
            color: theme.palette.success.contrastText,
          }} 
        />
      );
    return (
      <Chip 
        label="No auditada" 
        size="small" 
        sx={{
          backgroundColor: theme.palette.error.main,
          color: theme.palette.error.contrastText,
        }} 
      />
    );
  };

  const getReportadaChip = (estado) => {
    if (estado === "REPORTADA")
      return (
        <Chip 
          label="Reportada" 
          size="small" 
          sx={{
            backgroundColor: theme.palette.info.main,
            color: theme.palette.info.contrastText,
          }} 
        />
      );
    return (
      <Chip 
        label="No reportada" 
        size="small" 
        sx={{
          backgroundColor: theme.palette.warning.main,
          color: theme.palette.warning.contrastText,
        }} 
      />
    );
  };
  const handlePageChange = (event, value) => {
    if (onPageChange) onPageChange(value);
  };



  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <TableContainer>
          <Table>

            <TableHead>
              <TableRow
                sx={{
                  backgroundColor:
                    theme.palette.mode === "light"
                      ? "#EBF5FE"
                      : "rgba(255,255,255,0.05)",
                }}
              >
                {[
                  "Fecha y Hora",
                  "Duracion",
                  "Agente",
                  "Tipo de Llamada",
                  "Estado Auditoria",
                  "Estado Reportada",
                ].map((col) => (
                  <TableCell
                    key={col}
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: theme.palette.text.primary,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      py: 2,
                    }}
                  >
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Cargando llamadas...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : llamadas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{ py: 5, color: "text.secondary" }}
                  >
                    No se encontraron llamadas.
                  </TableCell>
                </TableRow>
              ) : (
                llamadas.map((row, index) => (
                  <TableRow
                    key={row.id}
                    onClick={() => navigate(`/auditoria-llamadas/${row.id}`)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor:
                          theme.palette.mode === "light"
                            ? "#F8FBFF"
                            : "rgba(255,255,255,0.05)",
                      },
                      backgroundColor:
                        theme.palette.mode === "light"
                          ? index % 2 === 0
                            ? "white"
                            : "#FAFCFE"
                          : index % 2 === 0
                          ? "transparent"
                          : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {formatearFechaHora(row.fecha_hora_inicio)}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.duracion_total_formateada || "N/A"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.agente_nombre || "N/A"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.es_venta === true ? "Venta" : "No Venta" || "N/A"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {getAuditoriaChip(row.estado_auditoria_valor)  || "N/A"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {getReportadaChip(row.estado_reportada_valor) || "N/A"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Página {page} de {totalPages}
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
      </Paper>

    </Box>
  );
}