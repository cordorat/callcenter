// PATH: src/pages/Backoffice/CallDetailPage.jsx
// Página de detalle de llamada para auditoría en backoffice

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Grid,
  TextField,
  useTheme,
  Snackbar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StorageIcon from "@mui/icons-material/Storage";
import MainLayout from "@/core/components/layout/MainLayout";
import { callsService } from "@/core/api/Calls";
import { useAuth } from "@/core/context/AuthContext";
import AudioPlayer from "@/components/backoffice/AudioPlayer";
import ReportCallDialog from "@/components/backoffice/ReportCallDialog";

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

export default function CallDetailPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const { llamadaId } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [llamada, setLlamada] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [auditNotes, setAuditNotes] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchLlamada = async () => {
      try {
        setLoading(true);
        setError(null);
        // Obtener detalles de la llamada
        const response = await callsService.getHistory({
          page: 1,
          page_size: 1,
        });
        
        // Buscar la llamada en los resultados (simplificado para demostración)
        // En producción, habría un endpoint específico para obtener una llamada por ID
        const llamadaDetail = response.results?.[0];
        
        if (llamadaDetail) {
          setLlamada(llamadaDetail);
        } else {
          setError("No se encontró la llamada solicitada");
        }
      } catch (err) {
        console.error("Error al cargar la llamada:", err);
        setError("Error al cargar los detalles de la llamada");
      } finally {
        setLoading(false);
      }
    };

    fetchLlamada();
  }, [llamadaId]);

  const handleMarkAsAudited = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmAudit = async () => {
    try {
      setConfirmDialogOpen(false);
      
      // Llamar al endpoint del backend para auditar
      const result = await callsService.auditCall(llamadaId, auditNotes);
      
      // Mostrar éxito
      setSnackbar({
        open: true,
        message: result.message || "Llamada marcada como auditada correctamente",
        severity: "success",
      });
      
      // Navegar a la lista después de 2 segundos
      setTimeout(() => {
        navigate("/auditoria-llamadas");
      }, 2000);
    } catch (err) {
      console.error("Error al marcar como auditada:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Error al marcar la llamada como auditada",
        severity: "error",
      });
    }
  };

  const handleReportCall = async (description) => {
    try {
      setReportLoading(true);
      
      // Llamar al endpoint del backend para reportar
      const result = await callsService.reportCall(llamadaId, description);
      
      // Mostrar éxito
      setSnackbar({
        open: true,
        message: result.message || "La llamada ha sido reportada exitosamente",
        severity: "success",
      });
      setReportDialogOpen(false);
      
      // Navegar a la lista después de 2 segundos
      setTimeout(() => {
        navigate("/auditoria-llamadas");
      }, 2000);
    } catch (err) {
      console.error("Error al reportar la llamada:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Error al reportar la llamada",
        severity: "error",
      });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <MainLayout title="Detalle de Llamada">
      <Box sx={{ p: { xs: 2, md: 3 }, pb: 6 }}>
        {/* Header con botón volver */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/auditoria-llamadas")}
              sx={{ 
                textTransform: "none",
                fontWeight: 600,
                fontSize: "14px",
                color: theme.palette.text.secondary,
                "&:hover": {
                  color: theme.palette.primary.main,
                  backgroundColor: "transparent"
                }
              }}
            >
              Volver a Llamadas
            </Button>
          </Box>

          {/* Información de la llamada en el header */}
          {llamada && (
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}
              >
                Llamada del {formatDate(llamada.fecha_hora_inicio)}
              </Typography>
              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PhoneIcon fontSize="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    {llamada.telefono_destino || "N/A"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PersonIcon fontSize="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    {llamada.cliente?.nombre || llamada.cliente_nombre || "N/A"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AccessTimeIcon fontSize="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    {formatDuration(llamada.duracion_segundos || 0)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading state */}
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "400px",
            }}
          >
            <CircularProgress size={60} />
          </Box>
        ) : llamada ? (
          <Grid container spacing={3}>
            {/* Sección 1: Información de la Llamada - Contenido Principal */}
            <Grid item xs={12}>
              <Card
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  boxShadow: isDark
                    ? "0 4px 12px rgba(0,0,0,0.3)"
                    : "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <StorageIcon color="primary" />
                    Información de la Llamada
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    {/* Duración total */}
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(12,21,90,0.05)",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                          }}
                        >
                          Duración Total
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700, color: "text.primary", mt: 0.5 }}
                        >
                          {formatDuration(
                            llamada.duracion_llamada_segundos ||
                              llamada.duracion_segundos ||
                              0
                          )}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Tipo de llamada */}
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(12,21,90,0.05)",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                          }}
                        >
                          Tipo de Llamada
                        </Typography>
                        <Chip
                          label={
                            llamada.fue_contestada
                              ? "Venta"
                              : "No Venta"
                          }
                          color={
                            llamada.fue_contestada
                              ? "success"
                              : "default"
                          }
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Grid>

                    {/* Fecha y hora de inicio */}
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(12,21,90,0.05)",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                          }}
                        >
                          Fecha y Hora de Inicio
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: "text.primary", mt: 0.5 }}
                        >
                          {formatDate(llamada.fecha_hora_inicio)}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Fecha y hora de finalización */}
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(12,21,90,0.05)",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                          }}
                        >
                          Fecha y Hora de Finalización
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: "text.primary", mt: 0.5 }}
                        >
                          {formatDate(llamada.fecha_hora_fin)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Sección 2: Datos del Cliente */}
              <Card
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  boxShadow: isDark
                    ? "0 4px 12px rgba(0,0,0,0.3)"
                    : "0 2px 8px rgba(0,0,0,0.1)",
                  mt: 3,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <PersonIcon color="primary" />
                    Datos del Cliente
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    {/* Nombre del cliente */}
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(12,21,90,0.05)",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                          }}
                        >
                          Nombre Completo
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 0.5 }}
                        >
                          {llamada.cliente?.nombre || llamada.cliente_nombre || "-"}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Teléfono */}
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(12,21,90,0.05)",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                          }}
                        >
                          Número de Teléfono
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 0.5 }}
                        >
                          {llamada.telefono_destino || "-"}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Identificación */}
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(12,21,90,0.05)",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                          }}
                        >
                          Identificación
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 0.5 }}
                        >
                          {llamada.cliente?.documento_id ||
                            llamada.cliente?.cliente_id ||
                            "-"}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Sección 3: Información del Agente */}
              <Card
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  boxShadow: isDark
                    ? "0 4px 12px rgba(0,0,0,0.3)"
                    : "0 2px 8px rgba(0,0,0,0.1)",
                  mt: 3,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <PersonIcon color="primary" />
                    Información del Agente
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    {/* Nombre del agente */}
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(12,21,90,0.05)",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                          }}
                        >
                          Nombre del Agente
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 0.5 }}
                        >
                          {llamada.agente?.first_name && llamada.agente?.last_name
                            ? `${llamada.agente.first_name} ${llamada.agente.last_name}`
                            : llamada.agente_nombre ||
                            "-"}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Producto vendido */}
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(12,21,90,0.05)",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                          }}
                        >
                          Producto Vendido
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 0.5 }}
                        >
                          {llamada.venta?.producto?.nombre ||
                            llamada.producto_nombre ||
                            "-"}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Sección 4: Reproductor de Audio y Transcripción */}
              <Card
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  boxShadow: isDark
                    ? "0 4px 12px rgba(0,0,0,0.3)"
                    : "0 2px 8px rgba(0,0,0,0.1)",
                  mt: 3,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <AudioFileIcon color="primary" />
                    Reproducción y Análisis del Audio
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  {/* Reproductor de audio */}
                  {llamada.grabacion_url ? (
                    <Box sx={{ mb: 3 }}>
                      <AudioPlayer
                        audioUrl={llamada.grabacion_url}
                        callDuration={
                          llamada.duracion_llamada_segundos ||
                          llamada.duracion_segundos
                        }
                      />
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      No hay grabación disponible para esta llamada
                    </Alert>
                  )}

                  {/* Transcripción */}
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      color: "text.secondary",
                    }}
                  >
                    Transcripción de la Llamada
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={
                      llamada.transcripcion ||
                      "No hay transcripción disponible para esta llamada."
                    }
                    readOnly
                    variant="outlined"
                    sx={{
                      bgcolor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(12,21,90,0.02)",
                      "& .MuiOutlinedInput-root": {
                        fontSize: "0.875rem",
                        fontFamily: "monospace",
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Sidebar: Auditoría */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  boxShadow: isDark
                    ? "0 4px 12px rgba(0,0,0,0.3)"
                    : "0 2px 8px rgba(0,0,0,0.1)",
                  border: `2px solid ${
                    llamada.estado_auditoria === "auditada" || llamada.estado_auditoria_valor === "AUDITADA"
                      ? "rgba(76, 175, 80, 0.3)"
                      : "rgba(255, 193, 7, 0.3)"
                  }`,
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      fontSize: "1rem",
                    }}
                  >
                    <CheckCircleIcon color="primary" fontSize="small" />
                    Estado de Auditoría
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  {/* Estado de auditoría - Chip más grande y destacado */}
                  <Box sx={{ mb: 3, textAlign: "center" }}>
                    <Chip
                      label={
                        llamada.estado_auditoria === "auditada" || llamada.estado_auditoria_valor === "AUDITADA"
                          ? "AUDITADA"
                          : "PENDIENTE"
                      }
                      color={
                        llamada.estado_auditoria === "auditada" || llamada.estado_auditoria_valor === "AUDITADA"
                          ? "success"
                          : "warning"
                      }
                      icon={
                        llamada.estado_auditoria === "auditada" || llamada.estado_auditoria_valor === "AUDITADA"
                          ? <CheckCircleIcon />
                          : undefined
                      }
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        height: "36px",
                        width: "100%",
                      }}
                    />
                  </Box>

                  {/* Información de auditoría previa */}
                  {(llamada.estado_auditoria === "auditada" || llamada.estado_auditoria_valor === "AUDITADA") && (
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: isDark
                          ? "rgba(76,175,80,0.1)"
                          : "rgba(76,175,80,0.05)",
                        border: "1px solid rgba(76,175,80,0.2)",
                        borderRadius: 1.5,
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          textTransform: "uppercase",
                        }}
                      >
                        Auditada por
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "success.main", mt: 0.5, fontSize: "0.95rem" }}
                      >
                        {llamada.usuario_auditoria || user?.first_name || "-"}
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          textTransform: "uppercase",
                          display: "block",
                          mt: 1,
                        }}
                      >
                        Fecha y Hora
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "success.main", mt: 0.3, fontSize: "0.9rem" }}
                      >
                        {formatDate(llamada.fecha_auditoria) || "-"}
                      </Typography>
                    </Box>
                  )}

                  {/* Notas de auditoría - solo si NO está auditada */}
                  {llamada.estado_auditoria !== "auditada" && llamada.estado_auditoria_valor !== "AUDITADA" && (
                    <>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          mb: 1,
                          color: "text.secondary",
                          fontSize: "0.85rem",
                        }}
                      >
                        Notas (Opcional)
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Escribe notas sobre la auditoría..."
                        value={auditNotes}
                        onChange={(e) => setAuditNotes(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{
                          mb: 2,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(12,21,90,0.02)",
                        }}
                      />
                    </>
                  )}

                  {/* Botones de Acción - lado a lado */}
                  {llamada.estado_auditoria !== "auditada" && llamada.estado_auditoria_valor !== "AUDITADA" ? (
                    <Box sx={{ display: "flex", gap: 1.5, mt: 2, flexDirection: { xs: "column", sm: "row" } }}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={handleMarkAsAudited}
                        startIcon={<CheckCircleIcon />}
                        sx={{
                          flex: 1,
                          fontWeight: 700,
                          py: 1.5,
                          backgroundColor: "#4CAF50",
                          "&:hover": {
                            backgroundColor: "#45a049",
                          },
                        }}
                      >
                        Marcar como Auditada
                      </Button>

                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => setReportDialogOpen(true)}
                        sx={{
                          flex: 1,
                          fontWeight: 700,
                          py: 1.5,
                          borderColor: "#FF9800",
                          color: "#FF9800",
                          "&:hover": {
                            backgroundColor: "rgba(255,152,0,0.1)",
                            borderColor: "#F57C00",
                          },
                        }}
                      >
                        Reportar Llamada
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", gap: 1.5, mt: 2, flexDirection: { xs: "column", sm: "row" } }}>
                      <Box
                        sx={{
                          flex: 1,
                          p: 2,
                          bgcolor: "rgba(76,175,80,0.1)",
                          border: "2px dashed rgba(76,175,80,0.4)",
                          borderRadius: 1.5,
                          textAlign: "center",
                        }}
                      >
                        <CheckCircleIcon sx={{ color: "success.main", fontSize: "2rem", mb: 1 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
                          Auditoría Completada
                        </Typography>
                      </Box>

                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => setReportDialogOpen(true)}
                        sx={{
                          flex: 1,
                          fontWeight: 700,
                          py: 1.5,
                          borderColor: "#FF9800",
                          color: "#FF9800",
                          "&:hover": {
                            backgroundColor: "rgba(255,152,0,0.1)",
                            borderColor: "#F57C00",
                          },
                        }}
                      >
                        Reportar Llamada
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="warning">No se encontraron datos de la llamada</Alert>
        )}
      </Box>

      {/* Diálogo de confirmación */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: "text.primary", fontSize: "1.1rem" }}>
          Confirmar Auditoría
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary", mt: 1, fontSize: "0.95rem" }}>
            ¿Está seguro de que desea marcar esta llamada como auditada? Esta
            acción registrará su fecha, hora y usuario, y no podrá ser revertida.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmAudit}
            variant="contained"
            color="success"
            sx={{ fontWeight: 600 }}
          >
            Sí, Confirmar Auditoría
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Reporte */}
      <ReportCallDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        onConfirm={handleReportCall}
        llamada={llamada}
        loading={reportLoading}
      />

      {/* Snackbar de Notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ mt: 10 }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}
