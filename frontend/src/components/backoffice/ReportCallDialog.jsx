// PATH: src/components/backoffice/ReportCallDialog.jsx
// Diálogo para reportar una llamada

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  useTheme,
  Card,
} from "@mui/material";
import ReportIcon from "@mui/icons-material/Report";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatDuration = (seconds) => {
  if (!seconds) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

export default function ReportCallDialog({
  open,
  onClose,
  onConfirm,
  llamada,
  loading = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const charCount = description.length;
  const maxChars = 500;
  const minChars = 10;
  const isValid = charCount >= minChars && charCount <= maxChars;

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxChars) {
      setDescription(value);
      setError("");
    }
  };

  const handleProceed = () => {
    if (charCount < minChars) {
      setError(`La descripción debe contener al menos ${minChars} caracteres`);
      return;
    }
    if (charCount > maxChars) {
      setError(`La descripción no puede exceder ${maxChars} caracteres`);
      return;
    }
    setConfirmationOpen(true);
  };

  const handleConfirmReport = async () => {
    setConfirmationOpen(false);
    await onConfirm(description);
    setDescription("");
    setError("");
  };

  const handleClose = () => {
    setDescription("");
    setError("");
    setConfirmationOpen(false);
    onClose();
  };

  return (
    <>
      {/* Diálogo Principal - Crear Reporte */}
      <Dialog open={open && !confirmationOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            fontWeight: 700,
            color: "text.primary",
            fontSize: "1.2rem",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <ReportIcon color="warning" />
          Reportar Llamada
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {/* Resumen de la Llamada */}
          <Card
            sx={{
              mb: 3,
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(12,21,90,0.02)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(12,21,90,0.1)"}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: "text.primary",
                  fontSize: "0.9rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Resumen de la Llamada
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                {/* Fecha */}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Fecha y Hora
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "text.primary", mt: 0.3 }}
                  >
                    {llamada ? formatDate(llamada.fecha_hora_inicio) : "-"}
                  </Typography>
                </Box>

                {/* Duración */}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Duración
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "text.primary", mt: 0.3 }}
                  >
                    {llamada
                      ? formatDuration(
                          llamada.duracion_llamada_segundos || llamada.duracion_segundos || 0
                        )
                      : "-"}
                  </Typography>
                </Box>

                {/* Agente */}
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Agente
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "text.primary", mt: 0.3 }}
                  >
                    {llamada?.nombre_agente || "-"}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Card>

          {/* Campo de Descripción */}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 1,
                color: "text.primary",
                fontSize: "0.9rem",
              }}
            >
              Descripción del Reporte
              <Typography component="span" sx={{ color: "error.main" }}>
                {" "}
                *
              </Typography>
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={5}
              placeholder="Describe el motivo del reporte (mínimo 10 caracteres)..."
              value={description}
              onChange={handleDescriptionChange}
              variant="outlined"
              disabled={loading}
              sx={{
                mb: 1,
                bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(12,21,90,0.02)",
              }}
            />

            {/* Contador de caracteres */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color:
                    charCount < minChars
                      ? "error.main"
                      : charCount > maxChars
                      ? "error.main"
                      : "text.secondary",
                  fontWeight: 600,
                }}
              >
                {charCount >= minChars && charCount <= maxChars
                  ? `✓ ${charCount}/${maxChars} caracteres`
                  : `${charCount}/${maxChars} caracteres`}
              </Typography>
              {charCount < minChars && (
                <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                  Mínimo {minChars} caracteres
                </Typography>
              )}
            </Box>

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mb: 2, fontSize: "0.85rem" }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            disabled={loading}
            sx={{ fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleProceed}
            variant="contained"
            color="warning"
            disabled={!isValid || loading}
            sx={{
              fontWeight: 600,
              backgroundColor: isValid ? "#FF9800" : "#BDBDBD",
            }}
          >
            {loading ? "Procesando..." : "Confirmar Reporte"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmación */}
      <Dialog open={confirmationOpen} onClose={() => !loading && setConfirmationOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            fontWeight: 700,
            color: "text.primary",
            fontSize: "1.1rem",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <ReportIcon color="warning" />
          Confirmar Reporte
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 2,
              fontSize: "0.95rem",
              lineHeight: 1.6,
            }}
          >
            ¿Está seguro que desea reportar esta llamada?
          </Typography>

          <Box
            sx={{
              p: 2,
              bgcolor: isDark ? "rgba(255,153,0,0.1)" : "rgba(255,153,0,0.05)",
              border: "1px solid rgba(255,153,0,0.3)",
              borderRadius: 1.5,
              mb: 2,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                textTransform: "uppercase",
                fontSize: "0.7rem",
                display: "block",
                mb: 1,
              }}
            >
              Descripción del Reporte
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.primary",
                fontWeight: 500,
                fontStyle: "italic",
                wordBreak: "break-word",
              }}
            >
              "{description}"
            </Typography>
          </Box>

          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.8rem",
              display: "block",
            }}
          >
            Se registrará la fecha, hora y usuario que realizó el reporte.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmationOpen(false)}
            variant="outlined"
            disabled={loading}
            sx={{ fontWeight: 600 }}
          >
            Volver Atrás
          </Button>
          <Button
            onClick={handleConfirmReport}
            variant="contained"
            color="warning"
            disabled={loading}
            sx={{
              fontWeight: 600,
              backgroundColor: "#FF9800",
              "&:hover": {
                backgroundColor: "#F57C00",
              },
            }}
          >
            {loading ? "Procesando..." : "Sí, Reportar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
