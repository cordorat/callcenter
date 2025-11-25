// PATH: src/pages/Dashboard/Dashboard.jsx
import * as React from "react";
import { useAuth } from "@/core/context/AuthContext";
import AgenteDashboard from "./AgenteDashboard";
import JefeCentroDashboard from "./JefeCentroDashboard";
import JefeCampañaDashboard from "./JefeCampañaDashboard";
import CoordinadorDashboard from "./CoordinadorDashboard";
import BackOfficeDashboard from "./BackOfficeDashboard";

// Mapeo de componentes por rol (Patrón moderno)
const DASHBOARD_BY_ROLE = {
  AGENTE: AgenteDashboard,
  JEFE_CENTRO: JefeCentroDashboard,
  JEFE_CAMPANA: JefeCampañaDashboard,
  COORDINADOR: CoordinadorDashboard,
  BACKOFFICE: BackOfficeDashboard,
};

export default function Dashboard() {
  const { user } = useAuth();
  
  // Seleccionar el componente correcto según el rol
  const DashboardComponent = DASHBOARD_BY_ROLE[user?.role] || AgenteDashboard;
  
  return <DashboardComponent />;

}