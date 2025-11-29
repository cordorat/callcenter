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
  IconButton,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CallDetailsModal from "./CallDetailsModal";
const cellBaseSx = (theme) => ({
  color: theme.palette.text.primary,
  fontSize: "0.85rem",
  borderBottom:
    theme.palette.mode === "light"
      ? "1px solid rgba(12, 21, 90, 0.1)"
      : "1px solid rgba(255, 255, 255, 0.1)",
  textAlign: "center",
});

export default function TablaLlamadas({
  llamadas = [],
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
}) {
  const theme = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);

  const handlePageChange = (event, value) => {
    if (onPageChange) onPageChange(value);
  };

  const handleOpenModal = (call) => {
    setSelectedCall(call);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCall(null);
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
                  "Nombre del cliente",
                  "Teléfono del cliente",
                  "Agente",
                  "Duración",
                  "Estado Llamada",
                  "Estado Venta",
                  "Acciones",
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
                      {row.cliente_telefono || "N/A"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.agente_nombre || "N/A"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.duracion_total_formateada || "00:00"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.resultado_llamada?.estado_llamada ==="COMPLETADA"? "Contestada":"No Contestada" || "N/A"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      {row.resultado_llamada?.venta_realizada === true ? "Sí" : "No"}
                    </TableCell>
                    <TableCell align="center" sx={cellBaseSx(theme)}>
                      <Tooltip title="Ver detalles" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenModal(row)}
                          sx={{
                            bgcolor: 'action.hover',
                            '&:hover': {
                              bgcolor: 'primary.main',
                              color: 'white',
                            },
                            transition: 'all 0.2s',
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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

      {/* Modal de detalles */}
      <CallDetailsModal
        open={modalOpen}
        onClose={handleCloseModal}
        callData={selectedCall}
      />
    </Box>
  );
}