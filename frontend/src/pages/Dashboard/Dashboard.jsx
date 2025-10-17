// PATH: src/pages/Dashboard/Dashboard.jsx
import * as React from "react";
import { useAuth } from "@/core/context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import AgenteDashboard from "./AgenteDashboard";

// Mapeo de componentes por rol (Patrón moderno)
const DASHBOARD_BY_ROLE = {
  ADMIN: AdminDashboard,
  AGENTE: AgenteDashboard,
};

export default function Dashboard() {
  const { user } = useAuth();
  
  // Seleccionar el componente correcto según el rol
  const DashboardComponent = DASHBOARD_BY_ROLE[user?.role] || AgenteDashboard;
  
  return <DashboardComponent />;
}
