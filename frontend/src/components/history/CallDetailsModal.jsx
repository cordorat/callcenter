import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Divider,
  Box,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function CallDetailsModal({ open, onClose, callData }) {
  const theme = useTheme();

  if (!callData) return null;

  const isVenta = callData.resultado_llamada?.venta_realizada === true;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        elevation: 2,
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>Detalle de Llamada</DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* SECCIÓN 1: Información del Cliente */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "text.secondary",
              }}
            >
              Información del Cliente
            </Typography>
            <Divider />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontWeight: 600 }}
                  >
                    Nombre
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {callData.cliente_nombre || "-"}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontWeight: 600 }}
                  >
                    Teléfono
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {callData.cliente_telefono || "-"}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* SECCIÓN 2: Información del Agente */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "text.secondary",
              }}
            >
              Información del Agente
            </Typography>
            <Divider />
            <Box>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 600 }}
              >
                Agente
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                {callData.agente_nombre || "-"}
              </Typography>
            </Box>
          </Box>

          {/* SECCIÓN 3: Información de la Llamada */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "text.secondary",
              }}
            >
              Información de la Llamada
            </Typography>
            <Divider />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontWeight: 600 }}
                  >
                    Duración
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {callData.duracion_total_formateada || "-"}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontWeight: 600 }}
                  >
                    Estado de la Llamada
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={
                        callData.resultado_llamada?.estado_llamada ===
                        "COMPLETADA"
                          ? "Contestada"
                          : "No contestada"
                      }
                      color={
                        callData.resultado_llamada?.estado_llamada ===
                        "COMPLETADA"
                          ? "success"
                          : "default"
                      }
                      size="small"
                    />
                  </Box>
                </Box>
              </Grid>
              {callData.fecha_inicio && (
                <Grid item xs={12}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontWeight: 600 }}
                    >
                      Fecha y Hora
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, mt: 0.5 }}
                    >
                      {new Date(callData.fecha_inicio).toLocaleString("es-ES", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>

          {/* SECCIÓN 4: Información de Venta (si existe) */}
          {isVenta && callData.venta_info && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: "success.main",
                }}
              >
                Información de Venta
              </Typography>
              <Divider />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontWeight: 600 }}
                    >
                      Producto
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, mt: 0.5 }}
                    >
                      {callData.venta_info.producto_nombre || "-"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontWeight: 600 }}
                    >
                      Monto
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, mt: 0.5, color: "success.main" }}
                    >
                      $
                      {parseFloat(callData.venta_info.monto).toLocaleString(
                        "es-CO",
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}{" "}
                      COP
                    </Typography>
                  </Box>
                </Grid>
                {callData.venta_info.observaciones && (
                  <Grid item xs={12}>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontWeight: 600 }}
                      >
                        Observaciones
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mt: 0.5 }}
                      >
                        {callData.venta_info.observaciones}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button
          onClick={onClose}
          sx={{
            backgroundColor: (theme) => theme.palette.primary.secondary,
            color: "white",
            textTransform: "none",
            "&:hover": {
              backgroundColor: (theme) => theme.palette.primary.secondary,
              opacity: 0.9,
            },
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
