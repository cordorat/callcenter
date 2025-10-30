// PATH: src/pages/Campaing/Campaing.jsx
import * as React from "react";
import { useAuth } from "@/core/context/AuthContext";
import CampaingJefeCampana from "./CampaingJefeCampana";
import CampaingJefeCentro from "./CampaingJefeCentro";

// Mapeo de componentes por rol (Patrón moderno)
const CAMPAING_BY_ROLE = {
  ADMIN: CampaingJefeCampana,
  JEFE_CENTRO: CampaingJefeCentro,
  JEFE_CAMPAÑA: CampaingJefeCampana,
};

export default function Campaing() {
  const { user } = useAuth();
  
  // Seleccionar el componente correcto según el rol
  const CampaingComponent = CAMPAING_BY_ROLE[user?.role] || CampaingJefeCampana;

  return <CampaingComponent />;

}