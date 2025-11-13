//Path: src/pages/Campaing/CampaingJefeCampana.jsx
//Pantalla para gestionar campañas

import * as React from "react";
import { Box, Button, Tooltip, IconButton, Select, MenuItem, FormControl, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Paper, InputLabel, TextField } from '@mui/material';
import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import MainLayout from '@/core/components/layout/MainLayout';
import UploadButton from "@/components/campaing/UploadButton";
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import EditIcon from '@mui/icons-material/Edit';

// Importar los componentes de cada pestaña
import CampaingBD from '@/components/campaing/CampaingBD';
import TeamsAccordion from '@/components/campaing/TeamsAccordion';

// Importar API
import { getMisCampanasJefe, updateSalesGoal, programarIteracionBase } from '@/core/api/campaigns';

// Importar estilos
import "./Campaing.css";

// Función helper para convertir Date a formato YYYY-MM-DDTHH:mm para datetime-local
const toLocalDateTimeString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const todayRange = () => {
  const d = new Date();
  const iso = toLocalDateTimeString(d);
  return { from: iso, to: iso };
};

export default function CampaingJefeCampana() {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState("database"); // "database" | "teams"
  const [selectedFile, setSelectedFile] = useState(null);
  const [from, setFrom] = React.useState(todayRange().from);
  
  // Estados para campañas
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const handleCloseSnackbar = () => {
    setSnackbar(s => ({ ...s, open: false }));
  };
  // Selección de base de datos
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  
  // Estados para meta de ventas
  const [salesGoal, setSalesGoal] = useState('');
  const [openSalesGoalModal, setOpenSalesGoalModal] = useState(false);
  const [tempSalesGoal, setTempSalesGoal] = useState('');
  const [savingSalesGoal, setSavingSalesGoal] = useState(false);

  // Estado para el modal de iteración
  const [openIteracionModal, setOpenIteracionModal] = useState(false);
  const [iniciandoIteracion, setIniciandoIteracion] = useState(false);

  // Cargar campañas al montar el componente
  useEffect(() => {
    loadCampaigns();
  }, []);

  // Actualizar meta cuando cambia la campaña seleccionada
  useEffect(() => {
    if (selectedCampaign) {
      const campaign = campaigns.find(c => c.id === parseInt(selectedCampaign));
      setSalesGoal(campaign?.objetivo_ventas || '');
    }
  }, [selectedCampaign, campaigns]);

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const response = await getMisCampanasJefe();
      console.log('Response mis campañas:', response); // Debug
      console.log('Campañas recibidas:', response.campanas); // Debug detallado
      setCampaigns(response.campanas || []);
      
      // NO seleccionar automáticamente ninguna campaña
      // El usuario debe elegir manualmente
    } catch (error) {
      console.error('Error al cargar campañas:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar las campañas',
        severity: 'error'
      });
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleOpenSalesGoalModal = () => {
    setTempSalesGoal(salesGoal || '');
    setOpenSalesGoalModal(true);
  };

  const handleCloseSalesGoalModal = () => {
    setOpenSalesGoalModal(false);
    setTempSalesGoal('');
  };

  const handleSaveSalesGoal = async () => {
    if (!tempSalesGoal || tempSalesGoal <= 0) {
      setSnackbar({
        open: true,
        message: 'Por favor ingresa un objetivo válido',
        severity: 'warning'
      });
      return;
    }

    setSavingSalesGoal(true);
    try {
      await updateSalesGoal(parseInt(selectedCampaign), parseInt(tempSalesGoal));
      setSalesGoal(tempSalesGoal);
      setOpenSalesGoalModal(false);
      
      // Actualizar lista de campañas
      await loadCampaigns();
      
      setSnackbar({
        open: true,
        message: 'Se ha guardado la nueva meta correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al actualizar meta de ventas:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la meta de ventas',
        severity: 'error'
      });
    } finally {
      setSavingSalesGoal(false);
      setTempSalesGoal('');
    }
  };

  // Convierte string tipo 'YYYY-MM-DDTHH:mm' a ISO con zona horaria local
  function toLocalISOStringWithTZ(str) {
    const date = new Date(str);
    const tzOffset = -date.getTimezoneOffset();
    const diff = tzOffset >= 0 ? '+' : '-';
    const pad = n => String(Math.floor(Math.abs(n))).padStart(2, '0');
    return (
      date.getFullYear() +
      '-' + pad(date.getMonth() + 1) +
      '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) +
      ':' + pad(date.getMinutes()) +
      ':' + pad(date.getSeconds()) +
      diff + pad(tzOffset / 60) + ':' + pad(tzOffset % 60)
    );
  }

  // Handler para abrir el modal de iteración
  const handleOpenIteracionModal = () => {
    if (!selectedBaseId) {
      setSnackbar({
        open: true,
        message: 'Selecciona una base de datos de la tabla para iniciar la iteración.',
        severity: 'warning'
      });
      return;
    }
    setOpenIteracionModal(true);
  };

  // Handler para cerrar el modal
  const handleCloseIteracionModal = () => {
    setOpenIteracionModal(false);
  };

  // Handler para confirmar y iniciar la iteración
  const handleConfirmarIteracion = async () => {
    setIniciandoIteracion(true);
    const baseId = selectedBaseId;
    const fechaISO = toLocalISOStringWithTZ(from); // ahora incluye zona horaria
    try {
      await programarIteracionBase(baseId, { fecha_hora_inicio_iteracion: fechaISO });
      setSnackbar({
        open: true,
        message: '¡La iteración de la base de datos fue programada exitosamente! Puedes ver la fecha en la columna correspondiente.',
        severity: 'success'
      });
      setOpenIteracionModal(false);
    } catch (error) {
      let backendMsg = 'No se pudo programar la iteración. Por favor verifica la campaña y la fecha seleccionada.';
      if (error && error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          backendMsg = error.response.data;
        } else if (error.response.data.detail) {
          backendMsg = error.response.data.detail;
        } else if (typeof error.response.data === 'object') {
          backendMsg = Object.values(error.response.data).join(' ');
        }
      }
      setSnackbar({
        open: true,
        message: backendMsg,
        severity: 'error'
      });
      console.error('Error al programar iteración:', error);
    } finally {
      setIniciandoIteracion(false);
    }
  };

  // Variables CSS dinámicas según el tema
  const isDark = theme.palette.mode === 'dark';
  const cssVariables = {
    '--text-primary': theme.palette.text.primary,
    '--text-secondary': theme.palette.text.secondary,
    '--primary-main': theme.palette.primary.main,
    '--primary-dark': isDark ? theme.palette.primary.dark : '#1a2b7a',
    '--campaign-filter-bg': isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFB',
    '--campaign-filter-shadow': isDark 
      ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
      : '0 2px 8px rgba(12, 21, 90, 0.06)',
    '--segmented-bg': isDark ? 'rgba(255,255,255,0.05)' : '#F0F4F8',
    '--segmented-border': isDark ? 'rgba(255,255,255,0.1)' : 'rgba(12, 21, 90, 0.12)',
    '--segmented-text': isDark ? 'rgba(255,255,255,0.7)' : 'rgba(12, 21, 90, 0.7)',
    '--segmented-hover': isDark ? 'rgba(255,255,255,0.08)' : 'rgba(12, 21, 90, 0.05)',
    '--segmented-active-shadow': isDark 
      ? '0 2px 4px rgba(0, 0, 0, 0.5)' 
      : '0 2px 4px rgba(12, 21, 90, 0.2)',
    '--campaign-content-bg': isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFB',
    '--campaign-content-shadow': isDark 
      ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
      : '0 2px 8px rgba(12, 21, 90, 0.06)',
    '--date-bg': isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0F4F8',
    '--date-border': isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(12, 21, 90, 0.15)',
    '--date-focus-shadow': isDark ? '0 0 0 3px rgba(47, 118, 230, 0.3)' : '0 0 0 3px rgba(12, 21, 90, 0.1)',
    '--date-icon-filter': isDark ? 'invert(1)' : 'none',
  };

  return (
    <MainLayout title="Campaña">
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8 }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            minWidth: '320px',
            borderRadius: '10px',
            backgroundColor: snackbar.severity === 'success' ? '#0f9d58' : 
                            snackbar.severity === 'error' ? '#d32f2f' : 
                            snackbar.severity === 'warning' ? '#f57c00' : '#1976d2',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(12, 21, 90, 0.15)',
            fontWeight: 500,
            fontSize: '0.95rem',
            '& .MuiAlert-icon': {
              fontSize: '1.3rem',
              color: '#fff',
            },
            '& .MuiAlert-message': {
              fontSize: '0.95rem',
              fontWeight: 500,
              color: '#fff',
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <div className="campaign-page" style={cssVariables}>
        {/* Header con controles */}
        <div className="campaign-header">
          {/* Lado izquierdo: Selector de campaña y meta de ventas */}
          <div className="campaign-left-controls">
            {/* Selector de campaña */}
            <Paper elevation={2} sx={{ p: 2, minWidth: 400 }}>
              <FormControl fullWidth>
                <InputLabel id="campana-select-label">Selecciona una campaña</InputLabel>
                <Select
                  labelId="campana-select-label"
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  disabled={loadingCampaigns}
                  label="Selecciona una campaña"
                >
                  <MenuItem value="">
                    <em style={{ fontStyle: 'normal' }}>-- Selecciona una campaña --</em>
                  </MenuItem>
                  {campaigns.map((campaign) => (
                    <MenuItem key={campaign.id} value={campaign.id}>
                      {campaign.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            {/* Meta de ventas - Solo visible si hay campaña seleccionada */}
            {selectedCampaign && (
            <div className="sales-goal-control">
              <div className="sales-goal-input-wrapper">
                <span className="input-prefix">Meta:</span>
                <input
                  type="number"
                  value={salesGoal}
                  readOnly
                  disabled={!selectedCampaign}
                  placeholder="0"
                  className="sales-goal-input"
                />
                
                <IconButton
                  size="small"
                  onClick={handleOpenSalesGoalModal}
                  disabled={!selectedCampaign}
                  sx={{
                    color: theme.palette.primary.main,
                    padding: '4px',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'light' 
                        ? 'rgba(12, 21, 90, 0.08)' 
                        : 'rgba(255,255,255,0.08)',
                    }
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </div>
            </div>
            )}
          </div>
          
          {/* Lado derecho: Botones de acción - Solo visible si hay campaña seleccionada */}
          {selectedCampaign && (
          <div className="campaign-actions">
            <Tooltip
              title="Iniciar iteración"
              placement="bottom"
              arrow
              slotProps={{
                tooltip: {
                  sx: {
                    bgcolor: (theme) => theme.palette.primary.main,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    py: 1,
                    px: 1.5,
                    borderRadius: '8px',
                    textAlign: 'center',
                  }
                },
                arrow: {
                  sx: {
                    color: (theme) => theme.palette.primary.main,
                  }
                }
              }}
            >
              <Button
                variant="contained"
                sx={{
                  backgroundColor: (theme) => theme.palette.primary.main,
                  color: 'white',
                  borderRadius: '50%',
                  minWidth: '56px',
                  width: '56px',
                  height: '56px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: theme.palette.mode === 'light' 
                    ? '0 2px 8px rgba(12, 21, 90, 0.2)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.5)',
                  '&:hover': {
                    backgroundColor: (theme) => theme.palette.primary.dark,
                    boxShadow: theme.palette.mode === 'light' 
                      ? '0 4px 12px rgba(12, 21, 90, 0.3)' 
                      : '0 4px 12px rgba(0, 0, 0, 0.7)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s ease',
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.8rem',
                  },
                }}
                onClick={handleOpenIteracionModal}
              >
                <PlayCircleFilledIcon />
              </Button>
            </Tooltip>
            <UploadButton onFileSelect={(file) => setSelectedFile(file)} />
          </div>
          )}
        </div>

        {/* Pestañas segmentadas - Solo visible si hay campaña seleccionada */}
        {selectedCampaign && (
        <div 
          className="kpi-filters" 
          style={{
            '--text-primary': theme.palette.text.primary,
            '--text-secondary': theme.palette.text.secondary,
            '--background-paper': theme.palette.background.paper,
            '--primary-main': theme.palette.primary.main,
            '--primary-dark': isDark ? theme.palette.primary.dark : '#1a2b7a',
            '--segmented-bg': isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0F4F8',
            '--segmented-border': isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(12, 21, 90, 0.12)',
            '--segmented-hover': isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(12, 21, 90, 0.05)',
            '--segmented-active-shadow': isDark 
              ? '0 2px 4px rgba(0, 0, 0, 0.5)' 
              : '0 2px 4px rgba(12, 21, 90, 0.2)',
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <div className="segmented">
            <button
              className={currentTab === "database" ? "active" : ""}
              onClick={() => setCurrentTab("database")}
            >
              Base de datos
            </button>
            <button
              className={currentTab === "teams" ? "active" : ""}
              onClick={() => setCurrentTab("teams")}
            >
              Equipos
            </button>
          </div>
        </div>
        )}

        {/* Contenido de las pestañas - Solo visible si hay campaña seleccionada */}
        {selectedCampaign && (
        <div >
          {currentTab === "database" && (
            <div className="campaign-tab-panel">
              <CampaingBD
                selectedFile={selectedFile}
                onClearFile={() => setSelectedFile(null)}
                onSelectBase={setSelectedBaseId}
                selectedBaseId={selectedBaseId}
                selectedCampaign={selectedCampaign}
              />
            </div>
          )}

          {currentTab === "teams" && (
            <div className="campaign-tab-panel">
              <TeamsAccordion 
                selectedCampaign={selectedCampaign}
                campaigns={campaigns}
              />
            </div>
          )}
        </div>
        )}
      </div>

      {/* Modal para cambiar objetivo de ventas */}
      <Dialog
        open={openSalesGoalModal}
        onClose={handleCloseSalesGoalModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            padding: '8px',
            backgroundColor: theme.palette.background.paper,
          }
        }}
      >
        <DialogTitle
          sx={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: theme.palette.text.primary,
            paddingBottom: '8px',
          }}
        >
          ¿Cuál es el nuevo objetivo de venta de la campaña?
        </DialogTitle>
        
        <DialogContent sx={{ paddingTop: '16px !important' }}>
          <TextField
            autoFocus
            margin="dense"
            label="Nuevo objetivo de ventas"
            type="number"
            fullWidth
            variant="outlined"
            value={tempSalesGoal}
            onChange={(e) => setTempSalesGoal(e.target.value)}
            disabled={savingSalesGoal}
            inputProps={{ min: 0 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                }
              }
            }}
          />
        </DialogContent>

        <DialogActions sx={{ padding: '16px 24px', gap: '12px' }}>
          <Button
            onClick={handleCloseSalesGoalModal}
            disabled={savingSalesGoal}
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 600,
              borderRadius: '8px',
              padding: '8px 20px',
              textTransform: 'none',
              fontSize: '0.95rem',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(12, 21, 90, 0.05)',
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveSalesGoal}
            disabled={savingSalesGoal}
            variant="contained"
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              fontWeight: 600,
              borderRadius: '8px',
              padding: '8px 24px',
              textTransform: 'none',
              fontSize: '0.95rem',
              boxShadow: isDark 
                ? '0 2px 8px rgba(0, 0, 0, 0.5)' 
                : '0 2px 8px rgba(12, 21, 90, 0.2)',
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                boxShadow: isDark 
                  ? '0 4px 12px rgba(0, 0, 0, 0.7)' 
                  : '0 4px 12px rgba(12, 21, 90, 0.3)',
              },
              '&:disabled': {
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
              }
            }}
          >
            {savingSalesGoal ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para programar iteración */}
      <Dialog
        open={openIteracionModal}
        onClose={handleCloseIteracionModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            padding: '8px',
            backgroundColor: theme.palette.background.paper,
          }
        }}
      >
        <DialogTitle
          sx={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: theme.palette.text.primary,
            paddingBottom: '8px',
          }}
        >
          Programar Iteración de Base de Datos
        </DialogTitle>
        
        <DialogContent sx={{ paddingTop: '16px !important' }}>
          <Box sx={{ mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
              Selecciona la fecha y hora en la que deseas iniciar la iteración de la base de datos.
            </Alert>
            
            <div 
              className="dates" 
              style={{
                '--text-primary': theme.palette.text.primary,
                '--text-secondary': theme.palette.text.secondary,
                '--primary-main': theme.palette.primary.main,
                '--date-bg': isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0F4F8',
                '--date-border': isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(12, 21, 90, 0.15)',
                '--date-focus-shadow': isDark ? '0 0 0 3px rgba(47, 118, 230, 0.3)' : '0 0 0 3px rgba(12, 21, 90, 0.1)',
                '--date-icon-filter': isDark ? 'invert(1)' : 'none',
              }}
            >
              <label>
                Fecha
                <input
                  type="date"
                  value={from.split('T')[0]}
                  onChange={(e) => {
                    const time = from.split('T')[1] || '00:00';
                    setFrom(`${e.target.value}T${time}`);
                  }}
                />
              </label>
              <label>
                Hora
                <input
                  type="time"
                  value={from.split('T')[1] || '00:00'}
                  onChange={(e) => {
                    const date = from.split('T')[0];
                    setFrom(`${date}T${e.target.value}`);
                  }}
                />
              </label>
            </div>
          </Box>
        </DialogContent>

        <DialogActions sx={{ padding: '16px 24px', gap: '12px' }}>
          <Button
            onClick={handleCloseIteracionModal}
            disabled={iniciandoIteracion}
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 600,
              borderRadius: '8px',
              padding: '8px 20px',
              textTransform: 'none',
              fontSize: '0.95rem',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(12, 21, 90, 0.05)',
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarIteracion}
            disabled={iniciandoIteracion}
            variant="contained"
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              fontWeight: 600,
              borderRadius: '8px',
              padding: '8px 24px',
              textTransform: 'none',
              fontSize: '0.95rem',
              boxShadow: isDark 
                ? '0 2px 8px rgba(0, 0, 0, 0.5)' 
                : '0 2px 8px rgba(12, 21, 90, 0.2)',
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                boxShadow: isDark 
                  ? '0 4px 12px rgba(0, 0, 0, 0.7)' 
                  : '0 4px 12px rgba(12, 21, 90, 0.3)',
              },
              '&:disabled': {
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
              }
            }}
          >
            {iniciandoIteracion ? 'Programando...' : 'Programar Iteración'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}