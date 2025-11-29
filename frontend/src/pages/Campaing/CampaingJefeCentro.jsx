// PATH: src/pages/Campaing/CampaingJefeCentro.jsx
import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button
} from "@mui/material";
import { useTheme } from '@mui/material/styles';
import {
  Add as AddIcon,
  Campaign as CampaignIcon,
  Domain as DomainIcon,
} from '@mui/icons-material';

import CreateProductModal from "@/components/campaing/CreateProductModal.jsx";
import CreateCampaignModal from "@/components/campaing/CreateCampaignModal.jsx";
import CampaignsComponent from "@/components/campaing/Campaings.jsx";
import EditCampaignModal from "@/components/campaing/EditCampaignModal.jsx";
import MainLayout from "@/core/components/layout/MainLayout";

/**
 * Página de gestión de campañas para Jefe de Centro
 */
export default function CampaingJefeCentro() {
  const theme = useTheme();

  // Modales
  const [openProducto, setOpenProducto] = useState(false);
  const [openCampana, setOpenCampana] = useState(false);
  const [openEditCampana, setOpenEditCampana] = useState(false);

  // Campaña seleccionada para editar
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Trigger para recargar campañas
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshCampanas = () => setRefreshKey(prev => prev + 1);

  // Producto
  const handleOpenProducto = () => setOpenProducto(true);
  const handleCloseProducto = () => {
    setOpenProducto(false);
    refreshCampanas();
  };

  // Crear campaña
  const handleOpenCampana = () => setOpenCampana(true);
  const handleCloseCampana = () => setOpenCampana(false);

  const handleCampanaCreated = () => {
    setOpenCampana(false);
    refreshCampanas();
  };

  // Editar campaña
  const handleOpenEditCampana = (campaign) => {
    console.log('[CampaingJefeCentro] abrir edición campaña', campaign);
    if (!campaign) return;
    setSelectedCampaign(campaign);
    setOpenEditCampana(true);
  };

  const handleCloseEditCampana = () => {
    setOpenEditCampana(false);
    setSelectedCampaign(null);
  };

  const handleCampanaUpdated = (updatedData) => {
    console.log('[CampaingJefeCentro] campaña actualizada (visual)', updatedData);
    setOpenEditCampana(false);
    setSelectedCampaign(null);
    refreshCampanas();
  };

  return (
    <MainLayout title="Gestión de Campañas">
      <Box sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
        
        {/* Header con gradiente adaptivo */}
        {(() => {
          const gradientBg = theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #2c86eeff 0%, #2a15e9ff 100%)'
            : 'linear-gradient(135deg, #0C155A 0%, #040c47ff 100%)';

          return (
            <Box
              sx={{
                background: gradientBg,
                borderRadius: 3,
                p: 4,
                mb: 4,
                boxShadow: theme.palette.mode === 'light'
                  ? '0 8px 32px rgba(102, 126, 234, 0.25)'
                  : '0 8px 32px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                transition: 'all 0.3s ease'
              }}
            >
              <Box sx={{ color: 'white' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DomainIcon sx={{ fontSize: 40 }} />
                  Campañas del Centro
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.95 }}>
                  Administra las campañas activas y crea nuevas campañas para tu centro
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={handleOpenProducto}
                  sx={{
                    bgcolor: theme.palette.mode === 'light' ? 'white' : 'rgba(255, 255, 255, 0.1)',
                    color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                    boxShadow: theme.palette.mode === 'light'
                      ? '0 4px 12px rgba(0,0,0,0.15)'
                      : '0 4px 12px rgba(0,0,0,0.3)',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'light' ? 'grey.100' : 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)',
                      boxShadow: theme.palette.mode === 'light'
                        ? '0 6px 20px rgba(0,0,0,0.2)'
                        : '0 6px 20px rgba(0,0,0,0.4)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Nuevo Producto
                </Button>
                
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CampaignIcon />}
                  onClick={handleOpenCampana}
                  sx={{
                    bgcolor: theme.palette.mode === 'light' ? 'white' : 'rgba(255, 255, 255, 0.1)',
                    color: theme.palette.mode === 'light' ? 'primary.main' : 'white',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                    boxShadow: theme.palette.mode === 'light'
                      ? '0 4px 12px rgba(0,0,0,0.15)'
                      : '0 4px 12px rgba(0,0,0,0.3)',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'light' ? 'grey.100' : 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)',
                      boxShadow: theme.palette.mode === 'light'
                        ? '0 6px 20px rgba(0,0,0,0.2)'
                        : '0 6px 20px rgba(0,0,0,0.4)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Nueva Campaña
                </Button>
              </Box>
            </Box>
          );
        })()}

        {/* Tabla de campañas con botón Editar */}
        <CampaignsComponent
          refreshTrigger={refreshKey}
          onEditCampaign={handleOpenEditCampana} 
          showActions={true}                     
        />

        {/* Modal de crear producto */}
        <CreateProductModal 
          open={openProducto} 
          onClose={handleCloseProducto} 
        />

        {/* Modal de crear campaña */}
        <CreateCampaignModal
          open={openCampana}
          onClose={handleCloseCampana}
          onCampaignCreated={handleCampanaCreated}
        />

        {/* Modal de editar campaña */}
        <EditCampaignModal
          open={openEditCampana}
          onClose={handleCloseEditCampana}
          campaign={selectedCampaign}
          onCampaignUpdated={handleCampanaUpdated}
        />
      </Box>
    </MainLayout>
  );
}
