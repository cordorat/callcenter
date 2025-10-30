import React from "react";
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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function TablaLlamadas({
  llamadas = [],
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
}) {
  const theme = useTheme();

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
            {/* 🔹 Encabezado */}
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
                  "Cliente",
                  "Teléfono",
                  "Agente",
                  "Duración",
                  "Contestada",
                  "Hubo Venta",
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

            {/* 🔹 Cuerpo */}
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
                    colSpan={6}
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
                    sx={{
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
                      {row.cliente_nombre || "N/A"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.telefono || "N/A"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.agente_nombre || "N/A"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.duracion ? `${row.duracion}s` : "-"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.fue_contestada ? "Sí" : "No"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.hubo_venta ? "Sí" : "No"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 🔹 Paginación (siempre visible) */}
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

// 🔹 Estilos base reutilizables
const cellBaseSx = (theme) => ({
  color: theme.palette.text.primary,
  fontSize: "0.85rem",
  borderBottom:
    theme.palette.mode === "light"
      ? "1px solid rgba(12, 21, 90, 0.1)"
      : "1px solid rgba(255, 255, 255, 0.1)",
  textAlign: "center",
});
