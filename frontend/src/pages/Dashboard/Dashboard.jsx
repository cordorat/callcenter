import * as react from 'react';
import './Dashboard.css';
import MainLayout from '@/core/components/layout/MainLayout';
import { useAuth } from '@/core/context/AuthContext';
import { Box, Card, CardContent, Typography, Grid, Divider } from '@mui/material';
import { useState } from 'react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [currentStatus, setCurrentStatus] = useState(null);

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
    }
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
          <Box sx={{ marginTop: '30px' }}>
            <Grid container spacing={3}>
              {/* Tarjeta de información del usuario */}
              <Grid item xs={12} md={6}>
                <Card elevation={3}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#0C155A', fontWeight: 600 }}>
                      Información del Usuario
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Usuario
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {user.email}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Nombre
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {user.first_name} {user.last_name}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Rol
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {user.role}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>


              {/* Botón de cerrar sesión */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <button 
                    onClick={handleLogout}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 500,
                      transition: 'background-color 0.3s',
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                  >
                    Cerrar Sesión
                  </button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;