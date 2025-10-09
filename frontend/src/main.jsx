import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@/core/context/AuthContext';
import { ThemeModeProvider } from '@/core/context/ThemeModeContext';
import App from './App'; 
import './App.css';    

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <AuthProvider>
        <App /> 
      </AuthProvider>
    </ThemeModeProvider>
  </React.StrictMode>
);