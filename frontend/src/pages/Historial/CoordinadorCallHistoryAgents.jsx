import MainLayout from "@/core/components/layout/MainLayout";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import TablaLlamadas from "@/components/history/CallHistoryAgents";
export default function CoordinadorCallHistoryAgents() {
    const today = new Date().toISOString().split('T')[0];
    const [estado, setEstado] = useState("todos");
    const [fechaInicio, setFechaInicio] = useState(today);
    const [fechaFin, setFechaFin] = useState(today);
    const [llamadas, setLlamadas] = useState([]); 
    const [loading, setLoading] = useState(false);   
    const fetchData = async () => {
       const llamadas= await callsService.getHistory();
    }
    useEffect(() => {
    fetchData();
    }, [fetchData]);
  return (
    <MainLayout title="Historial de Llamadas del Equipo">
        <Box sx={{ p: 2 }}>
          <TablaLlamadas llamadas={llamadas} loading={loading} />
        </Box>
    </MainLayout>
  )
}