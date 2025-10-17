//Path: src/pages/Campaing/Campaing.jsx
//Pantalla para gestionar campañas

import * as React from "react";
import { Box, Button, Tooltip, IconButton, Select, MenuItem, FormControl } from '@mui/material';
import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import MainLayout from '@/core/components/layout/MainLayout';
import UploadButton from "@/components/campaing/UploadButton";
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

// Importar los componentes de cada pestaña
import CampaingBD from '@/components/campaing/CampaingBD';
import Teams from '@/components/campaing/Teams';

// Importar API
import { getActiveCampaigns, updateSalesGoal } from '@/core/api/campaigns';

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

export default function Campaing() {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState("database"); // "database" | "teams"
  const [selectedFile, setSelectedFile] = useState(null);
  const [from, setFrom] = React.useState(todayRange().from);
  
  // Estados para campañas
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  
  // Estados para meta de ventas
  const [salesGoal, setSalesGoal] = useState('');
  const [isEditingSalesGoal, setIsEditingSalesGoal] = useState(false);
  const [tempSalesGoal, setTempSalesGoal] = useState('');
  const [savingSalesGoal, setSavingSalesGoal] = useState(false);

  // Cargar campañas al montar el componente
  useEffect(() => {
    loadCampaigns();
  }, []);

  // Actualizar meta cuando cambia la campaña seleccionada
  useEffect(() => {
    if (selectedCampaign) {
      const campaign = campaigns.find(c => {
        const campaignId = c.campana_id || c.id;
        return campaignId === parseInt(selectedCampaign);
      });
      setSalesGoal(campaign?.objetivo_ventas || '');
    }
  }, [selectedCampaign, campaigns]);

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const response = await getActiveCampaigns();
      console.log('Response campañas:', response); // Debug
      setCampaigns(response.campanas || []);
      
      // Seleccionar primera campaña por defecto
      if (response.campanas && response.campanas.length > 0) {
        const firstCampaign = response.campanas[0];
        // Usar campana_id o id según lo que tenga el objeto
        const campaignId = firstCampaign.campana_id || firstCampaign.id;
        if (campaignId) {
          setSelectedCampaign(campaignId.toString());
        }
      }
    } catch (error) {
      console.error('Error al cargar campañas:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleEditSalesGoal = () => {
    setTempSalesGoal(salesGoal);
    setIsEditingSalesGoal(true);
  };

  const handleSaveSalesGoal = async () => {
    setSavingSalesGoal(true);
    try {
      await updateSalesGoal(parseInt(selectedCampaign), parseInt(tempSalesGoal));
      setSalesGoal(tempSalesGoal);
      setIsEditingSalesGoal(false);
      
      // Actualizar lista de campañas
      await loadCampaigns();
    } catch (error) {
      console.error('Error al actualizar meta de ventas:', error);
    } finally {
      setSavingSalesGoal(false);
    }
  };

  const handleCancelEditSalesGoal = () => {
    setTempSalesGoal('');
    setIsEditingSalesGoal(false);
  };

  // Variables CSS dinámicas según el tema
  const cssVariables = {
    '--text-primary': theme.palette.text.primary,
    '--primary-main': theme.palette.primary.main,
    '--campaign-filter-bg': theme.palette.mode === 'light' ? '#F8FAFB' : 'rgba(255,255,255,0.03)',
    '--campaign-filter-shadow': theme.palette.mode === 'light' 
      ? '0 2px 8px rgba(12, 21, 90, 0.06)' 
      : '0 2px 8px rgba(0, 0, 0, 0.3)',
    '--segmented-bg': theme.palette.mode === 'light' ? '#F0F4F8' : 'rgba(255,255,255,0.05)',
    '--segmented-border': theme.palette.mode === 'light' ? 'rgba(12, 21, 90, 0.12)' : 'rgba(255,255,255,0.1)',
    '--segmented-text': theme.palette.mode === 'light' ? 'rgba(12, 21, 90, 0.7)' : 'rgba(255,255,255,0.7)',
    '--segmented-hover': theme.palette.mode === 'light' ? 'rgba(12, 21, 90, 0.05)' : 'rgba(255,255,255,0.08)',
    '--segmented-active-shadow': theme.palette.mode === 'light' 
      ? '0 2px 4px rgba(12, 21, 90, 0.2)' 
      : '0 2px 4px rgba(0, 0, 0, 0.5)',
    '--campaign-content-bg': theme.palette.mode === 'light' ? '#F8FAFB' : 'rgba(255,255,255,0.03)',
    '--campaign-content-shadow': theme.palette.mode === 'light' 
      ? '0 2px 8px rgba(12, 21, 90, 0.06)' 
      : '0 2px 8px rgba(0, 0, 0, 0.3)',
  };

  return (
    <MainLayout title="Campaña">
      <div className="campaign-page" style={cssVariables}>
        {/* Header con controles */}
        <div className="campaign-header">
          {/* Lado izquierdo: Selector de campaña y meta de ventas */}
          <div className="campaign-left-controls">
            {/* Selector de campaña */}
            <FormControl sx={{ minWidth: 220 }}>
              <Select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                disabled={loadingCampaigns}
                displayEmpty
                sx={{
                  backgroundColor: 'background.paper',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.mode === 'light' 
                      ? 'rgba(12, 21, 90, 0.12)' 
                      : 'rgba(255,255,255,0.1)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                  },
                }}
              >
                <MenuItem value="" disabled>
                  <em>Seleccionar Campaña</em>
                </MenuItem>
                {campaigns.map((campaign) => {
                  const campaignId = campaign.campana_id || campaign.id;
                  return (
                    <MenuItem key={campaignId} value={campaignId}>
                      {campaign.nombre}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Meta de ventas */}
            <div className="sales-goal-control">
              <div className="sales-goal-input-wrapper">
                <span className="input-prefix">Meta:</span>
                <input
                  type="number"
                  value={isEditingSalesGoal ? tempSalesGoal : salesGoal}
                  onChange={(e) => setTempSalesGoal(e.target.value)}
                  readOnly={!isEditingSalesGoal}
                  disabled={!selectedCampaign}
                  placeholder="0"
                  className="sales-goal-input"
                />
                
                {!isEditingSalesGoal ? (
                  <IconButton
                    size="small"
                    onClick={handleEditSalesGoal}
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
                ) : (
                  <>
                    <IconButton
                      size="small"
                      onClick={handleSaveSalesGoal}
                      disabled={savingSalesGoal}
                      sx={{
                        color: '#4caf50',
                        padding: '4px',
                        '&:hover': {
                          backgroundColor: 'rgba(76, 175, 80, 0.08)',
                        }
                      }}
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={handleCancelEditSalesGoal}
                      disabled={savingSalesGoal}
                      sx={{
                        color: '#f44336',
                        padding: '4px',
                        '&:hover': {
                          backgroundColor: 'rgba(244, 67, 54, 0.08)',
                        }
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Lado derecho: Fecha y botones de acción */}
          <div className="campaign-actions">
            <Tooltip
              title="Fecha y hora de inicio de iteración"
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
              <div className="date-time-inputs">
                <input
                  type="date"
                  value={from.split('T')[0]}
                  onChange={(e) => {
                    const time = from.split('T')[1] || '00:00';
                    setFrom(`${e.target.value}T${time}`);
                  }}
                  className="date-input"
                />
                <input
                  type="time"
                  value={from.split('T')[1] || '00:00'}
                  onChange={(e) => {
                    const date = from.split('T')[0];
                    setFrom(`${date}T${e.target.value}`);
                  }}
                  className="time-input"
                />
              </div>
            </Tooltip>
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
              >
                <PlayCircleFilledIcon />
              </Button>
            </Tooltip>
            <UploadButton onFileSelect={(file) => setSelectedFile(file)} />
          </div>
        </div>

        {/* Pestañas segmentadas */}
        <div className="campaign-filters">
          <div className="campaign-segmented">
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

        {/* Contenido de las pestañas */}
        <div className="campaign-content">
          {currentTab === "database" && (
            <div className="campaign-tab-panel">
              <CampaingBD selectedFile={selectedFile} onClearFile={() => setSelectedFile(null)} />
            </div>
          )}

          {currentTab === "teams" && (
            <div className="campaign-tab-panel">
              <Teams />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}