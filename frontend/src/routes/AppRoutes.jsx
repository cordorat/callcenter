import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import Login from '../pages/Login/Login';
import Dashboard from '../pages/Dashboard/Dashboard';
import Calls from '../pages/Calls/Calls';
import Kpis from '../pages/Kpis/Kpis';          
import Campaing from '../pages/Campaing/Campaing';
import Teams from '../pages/Teams/Teams';
import PrivateRoute from './PrivateRoute';
import Settings from '../pages/Settings/Settings';
import ProductsPage from '../pages/Campaing/Product';
import Usuarios from '../pages/Usuario/Usuarios';
import CrearUsuario from '../pages/Usuario/CrearUsuario';

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
        
        {/* Rutas protegidas */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/llamadas" 
          element={
            <PrivateRoute>
              <Calls />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/productos" 
          element={
            <PrivateRoute>
              <ProductsPage />
            </PrivateRoute>
          } 
        />

        <Route
          path="/kpis"
          element={
            <PrivateRoute>
              <Kpis />
            </PrivateRoute>
          }
        />

        <Route path="/campana" element={
          <PrivateRoute>
            <Campaing />
          </PrivateRoute>
        } />

        <Route path="/usuarios" element={
          <PrivateRoute>
            <Usuarios />
          </PrivateRoute>
        } />

        <Route path="/crear-usuario" element={
          <PrivateRoute>
            <CrearUsuario />
          </PrivateRoute>
        } />        

        <Route path="/equipos" element={
          <PrivateRoute>
            <Teams />
          </PrivateRoute>
        } />

        <Route path="/configuracion" element={
          <PrivateRoute>
            <Settings />
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
