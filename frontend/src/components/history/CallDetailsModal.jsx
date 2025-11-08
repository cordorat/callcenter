import React from "react";
import {
  Dialog,
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

  const DetailItem = ({ label, value }) => (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value || "N/A"}
      </Typography>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogContent sx={{ mt: 1 }}>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Información del Cliente
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <DetailItem label="Nombre" value={callData.cliente_nombre} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetailItem label="Teléfono" value={callData.cliente_telefono} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />


        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Información del Agente
        </Typography>
        <DetailItem label="Agente" value={callData.agente_nombre} />

        <Divider sx={{ my: 2 }} />


        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Información de la Llamada
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <DetailItem
              label="Duración"
              value={callData.duracion_total_formateada}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Estado de la llamada
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={
                  callData.resultado_llamada?.estado_llamada === "COMPLETADA"
                    ? "Contestada"
                    : "No contestada"
                }
                color={
                  callData.resultado_llamada?.estado_llamada === "COMPLETADA"
                    ? "success"
                    : "default"
                }
                size="small"
              />
            </Box>
          </Grid>
          {callData.fecha_inicio && (
            <Grid item xs={12}>
              <DetailItem
                label="Fecha y hora"
                value={new Date(callData.fecha_inicio).toLocaleString("es-ES", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              />
            </Grid>
          )}
        </Grid>


        {isVenta && callData.venta_info && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography
              variant="subtitle1"
              fontWeight={600}
              gutterBottom
              color="success.main"
            >
              Información de Venta
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: "rgba(76,175,80,0.1)",
                border: `1px solid ${theme.palette.success.main}`,
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <DetailItem 
                    label="Producto" 
                    value={callData.venta_info.producto_nombre} 
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailItem 
                    label="Monto" 
                    value={`$${parseFloat(callData.venta_info.monto).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} COP`} 
                  />
                </Grid>
                {callData.venta_info.observaciones && (
                  <Grid item xs={12}>
                    <DetailItem 
                      label="Observaciones" 
                      value={callData.venta_info.observaciones} 
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
