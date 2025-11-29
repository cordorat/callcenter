//Path: src/components/campaing/Teams.jsx
//Componente para mostrar equipos con agentes y asignar coordinadores

import { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Paper
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ExpandMore as ExpandMoreIcon,
  Groups as GroupsIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { asignarCoordinador } from '@/core/api/campaigns';

export default function Teams({ selectedCampaign = null, campaigns = [] }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  
  // Estados para el diálogo de confirmación
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState(null);
  const [asignando, setAsignando] = useState(false);

  // Obtener campaña seleccionada con sus datos completos
  const campaign = campaigns.find(c => c.id === parseInt(selectedCampaign));
  const equipos = campaign?.equipos || [];

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleAgenteClick = async (equipo, agente) => {
    try {
      setLoading(true);
      setError(null);

      const response = await asignarCoordinador(equipo.equipo_id, agente.documento_id, false);

      if (response.requiere_confirmacion) {
        setDialogData({
          equipo,
          agente,
          coordinador_anterior: response.coordinador_anterior,
          nuevo_coordinador: response.nuevo_coordinador
        });
        setDialogOpen(true);
      } else {
        setError({ type: 'success', message: response.message });
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      console.error('[Teams] Error al asignar coordinador:', err);
      setError({ 
        type: 'error', 
        message: err.response?.data?.message || err.response?.data?.errors?.agente_id?.[0] || 'Error al asignar coordinador'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarAsignacion = async () => {
    if (!dialogData) return;

    try {
      setAsignando(true);
      const response = await asignarCoordinador(
        dialogData.equipo.equipo_id,
        dialogData.agente.documento_id,
        true
      );

      setError({ type: 'success', message: response.message });
      setDialogOpen(false);
      setDialogData(null);
      
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('[Teams] Error al confirmar asignación:', err);
      setError({ 
        type: 'error', 
        message: err.response?.data?.message || 'Error al confirmar asignación'
      });
    } finally {
      setAsignando(false);
    }
  };

  const handleCancelarAsignacion = () => {
    setDialogOpen(false);
    setDialogData(null);
  };

  return (
    <Box>
      {error && (
        <Alert 
          severity={error.type || 'error'} 
          sx={{ mb: 3 }} 
          onClose={() => setError(null)}
        >
          {error.message || error}
        </Alert>
      )}

      {!selectedCampaign && (
        <Paper sx={{ 
          textAlign: 'center', 
          py: 8,
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
        }}>
          <GroupsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Selecciona una campaña
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Usa el selector de arriba para ver los equipos de una campaña
          </Typography>
        </Paper>
      )}

      {selectedCampaign && equipos.length === 0 && (
        <Paper sx={{ 
          textAlign: 'center', 
          py: 8,
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
        }}>
          <GroupsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No hay equipos en esta campaña
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Los equipos se asignan a campañas desde el módulo de "Equipos"
          </Typography>
        </Paper>
      )}

      {selectedCampaign && equipos.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {equipos.map((equipo) => (
            <Accordion
              key={equipo.equipo_id}
              expanded={expanded === equipo.equipo_id}
              onChange={handleAccordionChange(equipo.equipo_id)}
              sx={{
                backgroundColor: theme.palette.background.paper,
                borderRadius: '12px !important',
                boxShadow: theme.palette.mode === 'light'
                  ? '0 2px 8px rgba(12, 21, 90, 0.08)'
                  : '0 2px 8px rgba(0, 0, 0, 0.3)',
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  margin: '0 !important',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  borderRadius: '12px',
                  '&.Mui-expanded': {
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  },
                  backgroundColor: theme.palette.mode === 'light' 
                    ? '#F8FBFF' 
                    : 'rgba(255, 255, 255, 0.03)',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'light' 
                      ? '#EBF5FE' 
                      : 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <GroupsIcon sx={{ color: theme.palette.primary.main }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                      {equipo.nombre}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {equipo.cantidad_agentes} {equipo.cantidad_agentes === 1 ? 'agente' : 'agentes'}
                      {equipo.coordinador_info && (
                        <> • Coordinador: {equipo.coordinador_info.full_name}</>
                      )}
                    </Typography>
                  </Box>
                  {equipo.coordinador_info && (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Con coordinador"
                      size="small"
                      color="success"
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ p: 0 }}>
                <Box sx={{ px: 2, py: 1, backgroundColor: theme.palette.mode === 'light' ? '#FAFCFE' : 'rgba(255, 255, 255, 0.02)' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Haz clic en un agente para asignarlo como coordinador
                  </Typography>
                </Box>
                <Divider />
                
                {equipo.agentes && equipo.agentes.length > 0 ? (
                  <List sx={{ py: 0 }}>
                    {equipo.agentes.map((agente) => (
                      <ListItem
                        key={agente.documento_id}
                        disablePadding
                        sx={{
                          borderBottom: theme.palette.mode === 'light'
                            ? '1px solid rgba(12, 21, 90, 0.08)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          '&:last-child': {
                            borderBottom: 'none',
                          },
                        }}
                      >
                        <ListItemButton
                          onClick={() => handleAgenteClick(equipo, agente)}
                          disabled={loading}
                          sx={{
                            py: 1.5,
                            px: 3,
                            '&:hover': {
                              backgroundColor: theme.palette.mode === 'light'
                                ? '#EBF5FE'
                                : 'rgba(47, 118, 230, 0.1)',
                            },
                          }}
                        >
                          <PersonIcon sx={{ mr: 2, color: theme.palette.text.secondary }} />
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {agente.full_name}
                                </Typography>
                                {agente.es_coordinador_equipo && (
                                  <Chip
                                    label="Coordinador"
                                    size="small"
                                    color="primary"
                                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                {agente.email} • {agente.rol_nombre}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Este equipo no tiene agentes asignados
                    </Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleCancelarAsignacion}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 2,
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Reemplazar Coordinador
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="warning">
              Ya existe un coordinador en este equipo
            </Alert>
            
            {dialogData && (
              <>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                    Coordinador actual:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {dialogData.coordinador_anterior.full_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dialogData.coordinador_anterior.email}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                    Nuevo coordinador:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {dialogData.nuevo_coordinador.full_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dialogData.nuevo_coordinador.email}
                  </Typography>
                </Box>

                <Alert severity="info">
                  El coordinador anterior volverá a tener rol de AGENTE
                </Alert>
              </>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button
            onClick={handleCancelarAsignacion}
            disabled={asignando}
            sx={{
              backgroundColor: '#5A6269',
              color: 'white',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#5A6269',
                opacity: 0.9
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarAsignacion}
            disabled={asignando}
            variant="contained"
            sx={{ 
              textTransform: 'none',
              backgroundColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              }
            }}
          >
            {asignando ? 'Asignando...' : 'Confirmar y Reemplazar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
