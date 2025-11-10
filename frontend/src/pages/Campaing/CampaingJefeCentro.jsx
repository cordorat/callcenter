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
} from '@mui/icons-material';
import CreateProductModal from "@/components/campaing/CreateProductModal.jsx";
import CreateCampaignModal from "@/components/campaing/CreateCampaignModal.jsx";
import MainLayout from "@/core/components/layout/MainLayout";
import CampaignsComponent from "@/components/campaing/Campaings.jsx";

/**
 * Página de gestión de campañas para Jefe de Centro
 * Permite:
 * - Ver listado de campañas del centro
 * - Crear nuevas campañas
 * - Crear nuevos productos
 */
export default function CampaingJefeCentro() {
  const theme = useTheme();
  
  // Estados de modales
  const [openProducto, setOpenProducto] = useState(false);
  const [openCampana, setOpenCampana] = useState(false);
  
  // Control de refresco
  const [refreshKey, setRefreshKey] = useState(0);

  // Handlers de Producto
  const handleOpenProducto = () => setOpenProducto(true);
  const handleCloseProducto = () => {
    setOpenProducto(false);
    // Refrescar campañas por si se usó un nuevo producto
    refreshCampanas();
  };

  // Handlers de Campaña
  const handleOpenCampana = () => setOpenCampana(true);
  const handleCloseCampana = () => setOpenCampana(false);
  
  const handleCampanaCreated = () => {
    setOpenCampana(false);
    refreshCampanas();
  };

  // Refresco de tabla
  const refreshCampanas = () => setRefreshKey(prev => prev + 1);

  return (
    <MainLayout title="Gestión de Campañas">
      <Box sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
        
        {/* Header con descripción y botones */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 4,
            borderRadius: 3,
            backgroundColor: theme.palette.mode === 'light' 
              ? 'rgba(66, 165, 245, 0.05)' 
              : 'rgba(66, 165, 245, 0.1)',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Campañas del Centro
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Administra las campañas activas y crea nuevas campañas para tu centro
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleOpenProducto}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[4],
                  },
                  transition: 'all 0.2s',
                }}
              >
                Nuevo Producto
              </Button>
              
              <Button
                variant="contained"
                startIcon={<CampaignIcon />}
                onClick={handleOpenCampana}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  boxShadow: theme.shadows[3],
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[6],
                  },
                  transition: 'all 0.2s',
                }}
              >
                Nueva Campaña
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Tabla de campañas */}
        <CampaignsComponent
          refreshTrigger={refreshKey}
          onEditTeam={() => {}} // Por ahora sin edición
          showActions={false} // Sin acciones por ahora
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
      </Box>
    </MainLayout>
  );
}
