//Path: src/pages/Campaing/Campaing.jsx
//Pantalla para gestionar campañas

import * as React from "react";
import { Box, Button, Tooltip } from '@mui/material';
import { useState } from 'react';
import MainLayout from '@/core/components/layout/MainLayout';
import UploadButton from "@/components/campaing/UploadButton";
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';

// Importar los componentes de cada pestaña
import CampaingBD from '@/components/campaing/CampaingBD';
import Teams from '@/components/campaing/Teams';

// Importar estilos
import "./Campaing.css";

export default function Campaing() {
  const [currentTab, setCurrentTab] = useState("database"); // "database" | "teams"
  const [selectedFile, setSelectedFile] = useState(null);

  return (
    <MainLayout title="Campaña">
      <div className="campaign-page">
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
                    bgcolor: '#0C155A',
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
                    color: '#0C155A',
                  }
                }
              }}
            >
              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#0C155A',
                  color: 'white',
                  borderRadius: '50%',
                  minWidth: '56px',
                  width: '56px',
                  height: '56px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(12, 21, 90, 0.2)',
                  '&:hover': {
                    backgroundColor: '#1a2b7a',
                    boxShadow: '0 4px 12px rgba(12, 21, 90, 0.3)',
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