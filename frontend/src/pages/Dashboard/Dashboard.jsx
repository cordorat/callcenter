import * as react from 'react';
import { useState } from 'react';
import './Dashboard.css';
import MainLayout from '@/core/components/layout/MainLayout';
import { useAuth } from '@/core/context/AuthContext';
import ConfirmDialog from '@/components/forms/ConfirmDialog';
import { Typography, Box } from '@mui/material';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleLogoutClick = () => {
    setDialogOpen(true);
  };

  const handleConfirmLogout = () => {
    logout();
  };

  const handleStatusChange = (newStatus) => {
    setCurrentStatus(newStatus);
  };

  return (
    <MainLayout title="Dashboard">
      <Box className="dashboard-container">
        <Typography variant="h3" color="text.primary" gutterBottom>
          Panel de Control
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Has iniciado sesión correctamente
        </Typography>
        
        {user && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" color="text.secondary">
              <strong>Usuario:</strong> {user.email}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              <strong>Nombre:</strong> {user.first_name} {user.last_name}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              <strong>Rol:</strong> {user.role}
            </Typography>
          </Box>
        )}

        {/* Diálogo de confirmación para cerrar sesión */}
        <ConfirmDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirmLogout}
          title="Confirmar cierre de sesión"
          message="¿Está seguro de que desea cerrar la sesión?"
          confirmText="Cerrar sesión"
          cancelText="Cancelar"
        />
      </Box>
    </MainLayout>
  );
};

export default Dashboard;