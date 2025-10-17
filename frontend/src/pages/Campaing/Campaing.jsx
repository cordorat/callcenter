//Path: src/pages/Campaing/Campaing.jsx
//Pantalla para gestionar campañas

import * as React from "react";
import { Box, Button, Tooltip } from '@mui/material';
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import MainLayout from '@/core/components/layout/MainLayout';
import UploadButton from "@/components/campaing/UploadButton";
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';

// Importar los componentes de cada pestaña
import CampaingBD from '@/components/campaing/CampaingBD';
import Teams from '@/components/campaing/Teams';

// Importar estilos
import "./Campaing.css";

export default function Campaing() {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState("database"); // "database" | "teams"
  const [selectedFile, setSelectedFile] = useState(null);

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
        {/* Header con botones de acción */}
        <div className="campaign-header">
          <h2></h2>
          <div className="campaign-actions">
            <Tooltip
              title="Iniciar campaña"
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