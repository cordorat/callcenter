//Path: src/pages/Campaing/Campaing.jsx
//Pantalla para gestionar campañas

import * as React from "react";
import { Box, Button, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import MainLayout from '@/core/components/layout/MainLayout';
import UploadButton from "@/components/campaing/UploadButton";
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';

// Importar los componentes de cada pestaña
import CampaingBD from '@/components/campaing/CampaingBD';
import Teams from '@/components/campaing/Teams';

// Componente para el contenido de cada pestaña
function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Campaing() {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <MainLayout title="Campaña">
      {/* Botones de acción en la parte superior */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<PlayCircleFilledIcon />}
          sx={{
            backgroundColor: '#0C155A',
            color: 'white',
            borderRadius: '10px',
            textTransform: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
            px: 3,
            py: 1.2,
            boxShadow: '0 2px 8px rgba(12, 21, 90, 0.25)',
            '&:hover': {
              backgroundColor: '#1a2b7a',
              boxShadow: '0 4px 12px rgba(12, 21, 90, 0.35)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Iniciar Campaña
        </Button>
        <UploadButton onFileSelect={(file) => setSelectedFile(file)} />
      </Box>

        {/* Pestañas */}
      <Box sx={{ 
        borderRadius: 3, 
        overflow: 'hidden', 
        maxHeight: 'calc(100vh - 250px)',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 12px rgba(12, 21, 90, 0.15)',
        backgroundColor: 'white',
      }}>

        <Box sx={{ 
          borderBottom: 2, 
          borderColor: '#0C155A', 
          backgroundColor: '#D3E8FB',
        }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            TabIndicatorProps={{
              style: {
                backgroundColor: '#0C155A',
                height: 3,
              }
            }}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'rgba(12, 21, 90, 0.6)',
                minHeight: 56,
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: '#0C155A',
                  backgroundColor: 'rgba(12, 21, 90, 0.05)',
                },
                '&.Mui-selected': {
                  color: '#0C155A',
                },
              },
            }}
          >
            <Tab label="Base de datos" />
            <Tab label="Equipos" />
          </Tabs>
        </Box>

        {/* Contenido de cada pestaña */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <TabPanel value={currentTab} index={0}>
            <CampaingBD selectedFile={selectedFile} onClearFile={() => setSelectedFile(null)} />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Teams />
          </TabPanel>
        </Box>
      </Box>
    </MainLayout>
  );
}