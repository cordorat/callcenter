import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import Login from '../pages/Login/Login';
import Dashboard from '../pages/Dashboard/Dashboard';
import Calls from '../pages/Calls/Calls';
import Kpis from '../pages/Kpis/Kpis';
import KpisJefeCampana from '../pages/Kpis/KpisJefeCampana';
import KpisCoordinador from '../pages/Kpis/KpisCoordinador';
import Campaing from '../pages/Campaing/Campaing';
import Teams from '../pages/Teams/Teams';
import PrivateRoute from './PrivateRoute';
import Settings from '../pages/Settings/Settings';
import CampaingJefeCentro from '../pages/Campaing/CampaingJefeCentro';
import Usuarios from '../pages/Usuario/Usuarios';
import CrearUsuario from '../pages/Usuario/CrearUsuario';
import AgentesPage from '../pages/Kpis/AgentesPage';
import AgentDetailPage from '../pages/Kpis/AgentDetailPage';
import HistorialLlamadas from '@/pages/Historial/HistorialLlamadas';
import ProfilePage from '@/pages/Profile/ProfilePage';

// Componente que decide qué página de KPIs mostrar según el rol
const KpisRouter = () => {
  const { user } = useAuth();

  // Si es Jefe de Campaña, mostrar KPIs de campaña
  if (user?.role === 'JEFE_CAMPANA') {
    return <KpisJefeCampana />;
  }

  // Si es Coordinador, mostrar KPIs de coordinador
  if (user?.role === 'COORDINADOR') {
    return <KpisCoordinador />;
  }

  // Por defecto (AGENTE), mostrar KPIs de agente
  return <Kpis />;
};
import CoordinadorCallHistoryAgents from '@/pages/Historial/CoordinadorCallHistoryAgents';
import BackofficeCallsList from '@/pages/Backoffice/BackofficeCallsList';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Ruta pública: Login */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Ruta pública: Reset Password */}
        <Route
          path="/reset-password"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Rutas protegidas */}

        {/* Ruta Dashboard */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Ruta Llamadas */}
        <Route
          path="/llamadas"
          element={
            <PrivateRoute>
              <Calls />
            </PrivateRoute>
          }
        />

        {/* Ruta Historial de Llamadas */}
        <Route
          path="/historial"
          element={
            <PrivateRoute>
              <HistorialLlamadas />
            </PrivateRoute>
          }
        />

        <Route
          path="/historial/coordinador"
          element={
            <PrivateRoute>
              <CoordinadorCallHistoryAgents />
            </PrivateRoute>
          }
        />
        <Route
          path="/auditoria-llamadas"
          element={
            <PrivateRoute>
              <BackofficeCallsList />
            </PrivateRoute>
          }
        />

        {/* Ruta KPIs - Renderiza según rol */}
        <Route
          path="/kpis"
          element={
            <PrivateRoute>
              <KpisRouter />
            </PrivateRoute>
          }
        />

        {/* Rutas de KPI Coordinador */}
        <Route
          path="/kpis/agentes"
          element={
            <PrivateRoute>
              <AgentesPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/kpis/agentes/:documentoId"
          element={
            <PrivateRoute>
              <AgentDetailPage />
            </PrivateRoute>
          }
        />

        {/* Rutas de Campaña */}
        <Route path="/campana" element={
          <PrivateRoute>
            <Campaing />
          </PrivateRoute>
        } />

        {/* Rutas de Usuarios */}
        <Route path="/usuarios" element={
          <PrivateRoute>
            <Usuarios />
          </PrivateRoute>
        } />  

        {/* Ruta para equipos */}
        <Route path="/equipos" element={
          <PrivateRoute>
            <Teams />
          </PrivateRoute>
        } />

        {/* Ruta para configuracion */}
        <Route path="/configuracion" element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        } />

        {/* Ruta para perfil */}
        <Route path="/perfil" element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        } />

        {/* Ruta por defecto */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />}
        />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
