import * as react from 'react';
import './Dashboard.css';
import MainLayout from '@/core/components/layout/MainLayout';
import { useAuth } from '@/core/context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
    }
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
              onClick={handleLogout}
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
      </div>
    </MainLayout>
  );
};

export default Dashboard;