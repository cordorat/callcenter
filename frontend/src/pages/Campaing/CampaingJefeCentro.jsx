import { useState } from 'react';
import {
  Box,
  useTheme
} from "@mui/material";
import CreateProductModal from "../../components/campaing/CreateProductModal.jsx";
import MainLayout from "@/core/components/layout/MainLayout";
import CampaignsComponent from "@/components/campaing/Campaings.jsx";
import EditTeamModal from '@/components/teams/EditTeamModal';
import {Add as AddIcon,Campaign as CampaignIcon,} from '@mui/icons-material';
import ButtonTooltip from '@/components/campaing/ButtonTooltip.jsx';
export default function CampaingJefeCentro() {
  const [openProducto, setOpenProducto] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCampana, setSelectedCampana] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const theme = useTheme();

  // Producto
  const handleOpenProducto = () => setOpenProducto(true);
  const handleCloseProducto = () => setOpenProducto(false);

  // Editar
  const handleOpenEditModal = (campana) => {
    setSelectedCampana(campana);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedCampana(null);
  };

  const refreshCampanas = () => setRefreshKey(prev => prev + 1);

  const handleCampanaUpdated = () => {
    setEditModalOpen(false);
    setSelectedCampana(null);
    refreshCampanas();
  };

  return (
    <MainLayout title="Campañas">
      <Box maxWidth="100%" sx={{ py: 4 }}>

        <Box display="flex" sx={{flexDirection: 'row',gap: 5,mb: 4,justifyContent: 'flex-end',alignItems: 'center'}} >
          <ButtonTooltip
            title="Nuevo Producto"
            icon={<AddIcon />}
            onClick={handleOpenProducto}
            color="primary"
          />            
          <ButtonTooltip
            title="Nueva Campaña"
            icon={<CampaignIcon />}
            onClick={refreshCampanas}
            color="primary"
          />        
        </Box>

        <CreateProductModal open={openProducto} onClose={handleCloseProducto} />


        <CampaignsComponent
          key={refreshKey}
          onEditTeam={handleOpenEditModal}
          showActions={true}
        />


        {selectedCampana && editModalOpen && (
          <EditTeamModal
            open={editModalOpen}
            onClose={handleCloseEditModal}
            onCampanaUpdated={handleCampanaUpdated}
            campana={selectedCampana}
          />
        )}
      </Box>
    </MainLayout>
  );
}
