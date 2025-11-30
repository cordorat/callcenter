import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@/core/context/AuthContext';
import { AgentStateProvider } from '@/core/context/AgentStateContext';
import { ThemeModeProvider } from '@/core/context/ThemeModeContext';
import App from './App'; 
import './App.css';    

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <AuthProvider>
        <AgentStateProvider>
          <App /> 
        </AgentStateProvider>
      </AuthProvider>
    </ThemeModeProvider>
  </React.StrictMode>
);