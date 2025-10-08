import * as react from 'react';
import './Dashboard.css';
import MainLayout from '@/core/components/layout/MainLayout';

const Dashboard = () => {
  return (
    <MainLayout>
      <div className="dashboard-container">
        <h1>Panel de Control - CallCenter</h1>
        <p>Has iniciado sesión correctamente</p>
      </div>
    </MainLayout>
  );
};

export default Dashboard;