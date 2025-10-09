import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import Login from '../pages/Login/Login';
import Dashboard from '../pages/Dashboard/Dashboard';
import Calls from '../pages/Calls/Calls';
import PrivateRoute from './PrivateRoute';

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
        
        {/* Ruta por defecto: redirige a login o dashboard según autenticación */}
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} 
        />
      </Routes>
    </Router>
  );
};

export default AppRoutes;