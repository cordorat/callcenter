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
          color="primary"
          startIcon={<PlayCircleFilledIcon />}
        >
          Iniciar Campaña
        </Button>
        <UploadButton onFileSelect={(file) => setSelectedFile(file)} />
      </Box>

        {/* Pestañas */}
      <Box sx={{ border: 1, borderColor: '#0C155A', borderRadius: 2, overflow: 'hidden', height: 'calc(100% - 130px)' }}>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#f5f5f5' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Base de datos" />
            <Tab label="Equipos" />
          </Tabs>
        </Box>

        {/* Contenido de cada pestaña */}
        <TabPanel value={currentTab} index={0}>
          <CampaingBD selectedFile={selectedFile} onClearFile={() => setSelectedFile(null)} />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Teams />
        </TabPanel>
      </Box>
    </MainLayout>
  );
}