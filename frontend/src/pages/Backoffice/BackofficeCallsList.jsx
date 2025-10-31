import TablaLllamadasBackoffice from "@/components/backoffice/tablelist";
import { callsService } from "@/core/api/calls";
import MainLayout from "@/core/components/layout/MainLayout";
import React, { useState } from "react";
import { Box } from "@mui/material";
export default function BackofficeCallsList() {
  const [data, setData] = useState({ total_pages: 1 });
    const [loading, setLoading] = useState(false);
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [estado, setEstado] = useState("");
    const [busqueda, setBusqueda] = useState(""); 
    const [page, setPage] = useState(1);
    return (
        <MainLayout title="Historial de Llamadas - Backoffice">
            <Box sx={{ p: 2 }}>
                <TablaLllamadasBackoffice/>
            </Box>
        </MainLayout>
    );
}