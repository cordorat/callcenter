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
        
        // Obtener detalles de la llamada usando el endpoint específico por ID
        const response = await callsService.getHistory({
          page: 1,
          page_size: 100,
        });

        // Buscar la llamada específica por ID en los resultados
        const llamadaDetail = response.results?.find(
          (l) => l.id === parseInt(llamadaId)
        );

        if (llamadaDetail) {
          console.log("[CallDetailPage] Llamada cargada:", llamadaDetail);
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

    if (llamadaId) {
      fetchLlamada();
    }
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
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/auditoria-llamadas")}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: "14px",
              color: theme.palette.text.secondary,
              mb: 3,
              px: 0,
              "&:hover": {
                color: theme.palette.primary.main,
                backgroundColor: "transparent"
              }
            }}
          >
            Volver a Llamadas
          </Button>

          {/* Información de la llamada en el header - Card mejorado */}
          {llamada && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                background: isDark
                  ? "linear-gradient(135deg, rgba(33,150,243,0.1) 0%, rgba(156,39,176,0.1) 100%)"
                  : "linear-gradient(135deg, rgba(33,150,243,0.08) 0%, rgba(156,39,176,0.08) 100%)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                borderRadius: 3,
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #2196F3 0%, #9C27B0 100%)",
                }
              }}
            >
              <Typography
                variant="h5"
                sx={{ 
                  fontWeight: 700, 
                  color: "text.primary", 
                  mb: 2.5,
                  fontSize: { xs: "1.25rem", md: "1.5rem" }
                }}
              >
                Llamada del {formatDate(llamada.fecha_hora_inicio)}
              </Typography>
              <Box sx={{ 
                display: "flex", 
                gap: { xs: 2, md: 4 }, 
                flexWrap: "wrap", 
                alignItems: "center" 
              }}>
                <Box 
                  sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: isDark ? "rgba(33,150,243,0.15)" : "rgba(33,150,243,0.1)",
                  }}
                >
                  <PhoneIcon fontSize="small" sx={{ color: "#2196F3" }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                    {llamada.telefono_destino || "N/A"}
                  </Typography>
                </Box>
                <Box 
                  sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: isDark ? "rgba(156,39,176,0.15)" : "rgba(156,39,176,0.1)",
                  }}
                >
                  <PersonIcon fontSize="small" sx={{ color: "#9C27B0" }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                    {llamada.cliente?.nombre || llamada.cliente_nombre || "N/A"}
                  </Typography>
                </Box>
                <Box 
                  sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: isDark ? "rgba(76,175,80,0.15)" : "rgba(76,175,80,0.1)",
                  }}
                >
                  <AccessTimeIcon fontSize="small" sx={{ color: "#4CAF50" }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                    {formatDuration(llamada.duracion_segundos || 0)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>        {/* Error state */}
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
                elevation={0}
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: isDark
                      ? "0 8px 24px rgba(0,0,0,0.4)"
                      : "0 8px 24px rgba(0,0,0,0.12)",
                    transform: "translateY(-2px)",
                  }
                }}
              >
                <Box
                  sx={{
                    background: isDark
                      ? "linear-gradient(135deg, rgba(33,150,243,0.2) 0%, rgba(33,150,243,0.05) 100%)"
                      : "linear-gradient(135deg, rgba(33,150,243,0.1) 0%, rgba(33,150,243,0.03) 100%)",
                    p: 2.5,
                    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      fontSize: "1.1rem",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        bgcolor: isDark ? "rgba(33,150,243,0.2)" : "rgba(33,150,243,0.15)",
                      }}
                    >
                      <StorageIcon sx={{ color: "#2196F3", fontSize: 20 }} />
                    </Box>
                    Información de la Llamada
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>

                  <Grid container spacing={2}>
                    {/* Duración total */}
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          background: isDark
                            ? "linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(76,175,80,0.05) 100%)"
                            : "linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(76,175,80,0.03) 100%)",
                          border: `1px solid ${isDark ? "rgba(76,175,80,0.3)" : "rgba(76,175,80,0.2)"}`,
                          borderRadius: 2.5,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: isDark
                              ? "0 4px 12px rgba(76,175,80,0.2)"
                              : "0 4px 12px rgba(76,175,80,0.15)",
                          }
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "0.7rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Duración Total
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{ fontWeight: 800, color: "#4CAF50", mt: 1 }}
                        >
                          {formatDuration(
                            llamada.duracion ||
                            0
                          )}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Tipo de llamada */}
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          background: isDark
                            ? "linear-gradient(135deg, rgba(255,152,0,0.15) 0%, rgba(255,152,0,0.05) 100%)"
                            : "linear-gradient(135deg, rgba(255,152,0,0.1) 0%, rgba(255,152,0,0.03) 100%)",
                          border: `1px solid ${isDark ? "rgba(255,152,0,0.3)" : "rgba(255,152,0,0.2)"}`,
                          borderRadius: 2.5,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: isDark
                              ? "0 4px 12px rgba(255,152,0,0.2)"
                              : "0 4px 12px rgba(255,152,0,0.15)",
                          }
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "0.7rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Tipo de Llamada
                        </Typography>
                        <Box sx={{ mt: 1.5 }}>
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
                            sx={{ 
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              height: 32,
                              borderRadius: 2,
                            }}
                          />
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Fecha y hora de inicio */}
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          background: isDark
                            ? "linear-gradient(135deg, rgba(33,150,243,0.15) 0%, rgba(33,150,243,0.05) 100%)"
                            : "linear-gradient(135deg, rgba(33,150,243,0.1) 0%, rgba(33,150,243,0.03) 100%)",
                          border: `1px solid ${isDark ? "rgba(33,150,243,0.3)" : "rgba(33,150,243,0.2)"}`,
                          borderRadius: 2.5,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: isDark
                              ? "0 4px 12px rgba(33,150,243,0.2)"
                              : "0 4px 12px rgba(33,150,243,0.15)",
                          }
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "0.7rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Fecha y Hora de Inicio
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 1 }}
                        >
                          {formatDate(llamada.fecha_hora_inicio)}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Fecha y hora de finalización */}
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          background: isDark
                            ? "linear-gradient(135deg, rgba(156,39,176,0.15) 0%, rgba(156,39,176,0.05) 100%)"
                            : "linear-gradient(135deg, rgba(156,39,176,0.1) 0%, rgba(156,39,176,0.03) 100%)",
                          border: `1px solid ${isDark ? "rgba(156,39,176,0.3)" : "rgba(156,39,176,0.2)"}`,
                          borderRadius: 2.5,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: isDark
                              ? "0 4px 12px rgba(156,39,176,0.2)"
                              : "0 4px 12px rgba(156,39,176,0.15)",
                          }
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "0.7rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Fecha y Hora de Finalización
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 1 }}
                        >
                          {formatDate(llamada.fecha_hora_fin)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Sección 2: Datos del Cliente */}
              <Card
                elevation={0}
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  mt: 3,
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: isDark
                      ? "0 8px 24px rgba(0,0,0,0.4)"
                      : "0 8px 24px rgba(0,0,0,0.12)",
                    transform: "translateY(-2px)",
                  }
                }}
              >
                <Box
                  sx={{
                    background: isDark
                      ? "linear-gradient(135deg, rgba(156,39,176,0.2) 0%, rgba(156,39,176,0.05) 100%)"
                      : "linear-gradient(135deg, rgba(156,39,176,0.1) 0%, rgba(156,39,176,0.03) 100%)",
                    p: 2.5,
                    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      fontSize: "1.1rem",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        bgcolor: isDark ? "rgba(156,39,176,0.2)" : "rgba(156,39,176,0.15)",
                      }}
                    >
                      <PersonIcon sx={{ color: "#9C27B0", fontSize: 20 }} />
                    </Box>
                    Datos del Cliente
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>

                  <Grid container spacing={2}>
                    {/* Nombre del cliente */}
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          background: isDark
                            ? "linear-gradient(135deg, rgba(156,39,176,0.12) 0%, rgba(156,39,176,0.04) 100%)"
                            : "linear-gradient(135deg, rgba(156,39,176,0.08) 0%, rgba(156,39,176,0.02) 100%)",
                          border: `1px solid ${isDark ? "rgba(156,39,176,0.25)" : "rgba(156,39,176,0.15)"}`,
                          borderRadius: 2.5,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: isDark
                              ? "0 4px 12px rgba(156,39,176,0.2)"
                              : "0 4px 12px rgba(156,39,176,0.12)",
                          }
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "0.7rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Nombre Completo
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 0.5 }}
                        >
                          {llamada.cliente?.nombre || llamada.cliente_nombre || "-"}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Teléfono */}
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          background: isDark
                            ? "linear-gradient(135deg, rgba(33,150,243,0.12) 0%, rgba(33,150,243,0.04) 100%)"
                            : "linear-gradient(135deg, rgba(33,150,243,0.08) 0%, rgba(33,150,243,0.02) 100%)",
                          border: `1px solid ${isDark ? "rgba(33,150,243,0.25)" : "rgba(33,150,243,0.15)"}`,
                          borderRadius: 2.5,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: isDark
                              ? "0 4px 12px rgba(33,150,243,0.2)"
                              : "0 4px 12px rgba(33,150,243,0.12)",
                          }
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "0.7rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Número de Teléfono
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 0.5 }}
                        >
                          {llamada.telefono_destino || "-"}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Identificación */}
                    <Grid item xs={12}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          background: isDark
                            ? "linear-gradient(135deg, rgba(255,152,0,0.12) 0%, rgba(255,152,0,0.04) 100%)"
                            : "linear-gradient(135deg, rgba(255,152,0,0.08) 0%, rgba(255,152,0,0.02) 100%)",
                          border: `1px solid ${isDark ? "rgba(255,152,0,0.25)" : "rgba(255,152,0,0.15)"}`,
                          borderRadius: 2.5,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: isDark
                              ? "0 4px 12px rgba(255,152,0,0.2)"
                              : "0 4px 12px rgba(255,152,0,0.12)",
                          }
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "0.7rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Identificación
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 0.5 }}
                        >
                          {llamada.cliente_otros_datos?.documento_id ||
                            llamada.cliente_otros_datos?.identificacion ||
                            "-"}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Sección 3: Información del Agente */}
              <Card
                elevation={0}
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  mt: 3,
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: isDark
                      ? "0 8px 24px rgba(0,0,0,0.4)"
                      : "0 8px 24px rgba(0,0,0,0.12)",
                    transform: "translateY(-2px)",
                  }
                }}
              >
                <Box
                  sx={{
                    background: isDark
                      ? "linear-gradient(135deg, rgba(76,175,80,0.2) 0%, rgba(76,175,80,0.05) 100%)"
                      : "linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(76,175,80,0.03) 100%)",
                    p: 2.5,
                    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      fontSize: "1.1rem",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        bgcolor: isDark ? "rgba(76,175,80,0.2)" : "rgba(76,175,80,0.15)",
                      }}
                    >
                      <PersonIcon sx={{ color: "#4CAF50", fontSize: 20 }} />
                    </Box>
                    Información del Agente
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>

                  <Grid container spacing={2}>
                    {/* Nombre del agente */}
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          background: isDark
                            ? "linear-gradient(135deg, rgba(76,175,80,0.12) 0%, rgba(76,175,80,0.04) 100%)"
                            : "linear-gradient(135deg, rgba(76,175,80,0.08) 0%, rgba(76,175,80,0.02) 100%)",
                          border: `1px solid ${isDark ? "rgba(76,175,80,0.25)" : "rgba(76,175,80,0.15)"}`,
                          borderRadius: 2.5,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: isDark
                              ? "0 4px 12px rgba(76,175,80,0.2)"
                              : "0 4px 12px rgba(76,175,80,0.12)",
                          }
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "0.7rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Nombre del Agente
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 0.5 }}
                        >
                          {llamada.agente?.first_name && llamada.agente?.last_name
                            ? `${llamada.agente.first_name} ${llamada.agente.last_name}`
                            : llamada.agente_nombre ||
                            "-"}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Producto vendido */}
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          background: isDark
                            ? "linear-gradient(135deg, rgba(63,81,181,0.12) 0%, rgba(63,81,181,0.04) 100%)"
                            : "linear-gradient(135deg, rgba(63,81,181,0.08) 0%, rgba(63,81,181,0.02) 100%)",
                          border: `1px solid ${isDark ? "rgba(63,81,181,0.25)" : "rgba(63,81,181,0.15)"}`,
                          borderRadius: 2.5,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: isDark
                              ? "0 4px 12px rgba(63,81,181,0.2)"
                              : "0 4px 12px rgba(63,81,181,0.12)",
                          }
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "0.7rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Producto Vendido
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 600, color: "text.primary", mt: 0.5 }}
                        >
                          {llamada.venta?.producto?.nombre ||
                            llamada.producto_nombre ||
                            "-"}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Sección 4: Reproductor de Audio y Transcripción */}
              <Card
                elevation={0}
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  mt: 3,
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: isDark
                      ? "0 8px 24px rgba(0,0,0,0.4)"
                      : "0 8px 24px rgba(0,0,0,0.12)",
                    transform: "translateY(-2px)",
                  }
                }}
              >
                <Box
                  sx={{
                    background: isDark
                      ? "linear-gradient(135deg, rgba(255,152,0,0.2) 0%, rgba(255,152,0,0.05) 100%)"
                      : "linear-gradient(135deg, rgba(255,152,0,0.1) 0%, rgba(255,152,0,0.03) 100%)",
                    p: 2.5,
                    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      fontSize: "1.1rem",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        bgcolor: isDark ? "rgba(255,152,0,0.2)" : "rgba(255,152,0,0.15)",
                      }}
                    >
                      <AudioFileIcon sx={{ color: "#FF9800", fontSize: 20 }} />
                    </Box>
                    Reproducción y Análisis del Audio
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>

                  {/* Reproductor de audio */}
                  {(llamada.grabacion_url || llamada.twilio_recording_url) ? (
                    <Box sx={{ mb: 3 }}>
                      <AudioPlayer
                        audioUrl={callsService.getRecordingProxyUrl(llamada.id)}
                        callDuration={
                          llamada.duracion ||
                          llamada.duracion_segundos ||
                          0
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
                      llamada.transcipcion ||
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
                elevation={0}
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  border: llamada.estado_auditoria === "auditada" || llamada.estado_auditoria_valor === "AUDITADA"
                    ? `2px solid ${isDark ? "rgba(76,175,80,0.5)" : "rgba(76,175,80,0.4)"}`
                    : `2px solid ${isDark ? "rgba(255,193,7,0.5)" : "rgba(255,193,7,0.4)"}`,
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: isDark
                      ? "0 8px 24px rgba(0,0,0,0.4)"
                      : "0 8px 24px rgba(0,0,0,0.12)",
                    transform: "translateY(-2px)",
                  }
                }}
              >
                <Box
                  sx={{
                    background: llamada.estado_auditoria === "auditada" || llamada.estado_auditoria_valor === "AUDITADA"
                      ? isDark
                        ? "linear-gradient(135deg, rgba(76,175,80,0.25) 0%, rgba(76,175,80,0.1) 100%)"
                        : "linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(76,175,80,0.05) 100%)"
                      : isDark
                        ? "linear-gradient(135deg, rgba(255,193,7,0.25) 0%, rgba(255,193,7,0.1) 100%)"
                        : "linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,193,7,0.05) 100%)",
                    p: 2.5,
                    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      fontSize: "1.1rem",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        bgcolor: llamada.estado_auditoria === "auditada" || llamada.estado_auditoria_valor === "AUDITADA"
                          ? isDark ? "rgba(76,175,80,0.3)" : "rgba(76,175,80,0.2)"
                          : isDark ? "rgba(255,193,7,0.3)" : "rgba(255,193,7,0.2)",
                      }}
                    >
                      <CheckCircleIcon 
                        sx={{ 
                          color: llamada.estado_auditoria === "auditada" || llamada.estado_auditoria_valor === "AUDITADA"
                            ? "#4CAF50" 
                            : "#FFC107",
                          fontSize: 20 
                        }} 
                      />
                    </Box>
                    Estado de Auditoría
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>

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
                    <Box sx={{ display: "flex", gap: 2, mt: 3, flexDirection: { xs: "column", sm: "row" } }}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={handleMarkAsAudited}
                        startIcon={<CheckCircleIcon />}
                        sx={{
                          flex: 1,
                          fontWeight: 700,
                          py: 1.8,
                          fontSize: "0.95rem",
                          textTransform: "none",
                          borderRadius: 2.5,
                          background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
                          boxShadow: isDark
                            ? "0 4px 12px rgba(76,175,80,0.3)"
                            : "0 4px 12px rgba(76,175,80,0.25)",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            background: "linear-gradient(135deg, #45a049 0%, #388e3c 100%)",
                            boxShadow: isDark
                              ? "0 6px 16px rgba(76,175,80,0.4)"
                              : "0 6px 16px rgba(76,175,80,0.35)",
                            transform: "translateY(-2px)",
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
                          py: 1.8,
                          fontSize: "0.95rem",
                          textTransform: "none",
                          borderRadius: 2.5,
                          borderWidth: 2,
                          borderColor: "#FF9800",
                          color: "#FF9800",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            borderWidth: 2,
                            backgroundColor: "rgba(255,152,0,0.15)",
                            borderColor: "#F57C00",
                            color: "#F57C00",
                            transform: "translateY(-2px)",
                            boxShadow: isDark
                              ? "0 4px 12px rgba(255,152,0,0.3)"
                              : "0 4px 12px rgba(255,152,0,0.25)",
                          },
                        }}
                      >
                        Reportar Llamada
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", gap: 2, mt: 3, flexDirection: { xs: "column", sm: "row" } }}>
                      <Paper
                        elevation={0}
                        sx={{
                          flex: 1,
                          p: 2.5,
                          background: isDark
                            ? "linear-gradient(135deg, rgba(76,175,80,0.2) 0%, rgba(76,175,80,0.1) 100%)"
                            : "linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(76,175,80,0.05) 100%)",
                          border: `2px dashed ${isDark ? "rgba(76,175,80,0.5)" : "rgba(76,175,80,0.4)"}`,
                          borderRadius: 2.5,
                          textAlign: "center",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <CheckCircleIcon sx={{ color: "#4CAF50", fontSize: "2.5rem", mb: 1 }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#4CAF50", fontSize: "0.95rem" }}>
                          Auditoría Completada
                        </Typography>
                      </Paper>

                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => setReportDialogOpen(true)}
                        sx={{
                          flex: 1,
                          fontWeight: 700,
                          py: 1.8,
                          fontSize: "0.95rem",
                          textTransform: "none",
                          borderRadius: 2.5,
                          borderWidth: 2,
                          borderColor: "#FF9800",
                          color: "#FF9800",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            borderWidth: 2,
                            backgroundColor: "rgba(255,152,0,0.15)",
                            borderColor: "#F57C00",
                            color: "#F57C00",
                            transform: "translateY(-2px)",
                            boxShadow: isDark
                              ? "0 4px 12px rgba(255,152,0,0.3)"
                              : "0 4px 12px rgba(255,152,0,0.25)",
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
        <DialogActions sx={{ p: 3, gap: 1.5 }}>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            variant="outlined"
            sx={{ 
              fontWeight: 700,
              px: 3,
              py: 1.2,
              textTransform: "none",
              borderRadius: 2,
              borderWidth: 2,
              "&:hover": {
                borderWidth: 2,
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmAudit}
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            sx={{ 
              fontWeight: 700,
              px: 3,
              py: 1.2,
              textTransform: "none",
              borderRadius: 2,
              background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
              boxShadow: "0 4px 12px rgba(76,175,80,0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #45a049 0%, #388e3c 100%)",
                boxShadow: "0 6px 16px rgba(76,175,80,0.4)",
              }
            }}
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
