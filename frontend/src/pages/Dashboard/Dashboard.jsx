import * as react from 'react';
import { useState } from 'react';
import './Dashboard.css';
import MainLayout from '@/core/components/layout/MainLayout';
import { useAuth } from '@/core/context/AuthContext';
import ConfirmDialog from '@/components/forms/ConfirmDialog';

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
      <div className="dashboard-container">
        <h1>Panel de Control</h1>
        <p>Has iniciado sesión correctamente</p>
        
        {user && (
          <div style={{ marginTop: '20px' }}>
            <p><strong>Usuario:</strong> {user.email}</p>
            <p><strong>Nombre:</strong> {user.first_name} {user.last_name}</p>
            <p><strong>Rol:</strong> {user.role}</p>
            <button 
              onClick={handleLogoutClick}
              style={{
                marginTop: '10px',
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cerrar Sesión
            </button>
          </div>
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
      </div>
    </MainLayout>
  );
};

export default Dashboard;