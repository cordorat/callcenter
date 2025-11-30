import TablaLllamadasBackoffice from "@/components/backoffice/TableList";
import FiltrosyBusquedaBackoffice from "@/components/backoffice/SearchAndFiltersBackoffice";
import { callsService } from "@/core/api/Calls";
import MainLayout from "@/core/components/layout/MainLayout";
import React, { useState, useCallback, useEffect } from "react";
import { Box, Typography, useTheme } from "@mui/material";
export default function BackofficeCallsList() {
  const theme = useTheme();
  const [data, setData] = useState({ total_pages: 1 });
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estadoReportada, setEstadoReportada] = useState("todos");
  const [estadoAuditada, setEstadoAuditada] = useState("todos");
  const [page, setPage] = useState(1);

  // Generar título dinámico basado en filtros activos
  const getTitleSubtitle = () => {
    const filters = [];
    if (estadoReportada !== "todos") {
      filters.push(`Reportada: ${estadoReportada === "REPORTADA" ? "Sí" : "No"}`);
    }
    if (estadoAuditada !== "todos") {
      filters.push(`Auditada: ${estadoAuditada === "AUDITADA" ? "Sí" : "No"}`);
    }
    if (fechaInicio || fechaFin) {
      if (fechaInicio && fechaFin) {
        filters.push(`${fechaInicio} a ${fechaFin}`);
      } else if (fechaInicio) {
        filters.push(`Desde ${fechaInicio}`);
      } else if (fechaFin) {
        filters.push(`Hasta ${fechaFin}`);
      }
    }
    return filters.length > 0 ? filters.join(" • ") : "Sin filtros";
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        fecha_desde: fechaInicio || undefined,
        fecha_hasta: fechaFin || undefined,
        estado_reportada: estadoReportada !== "todos" ? estadoReportada : undefined,
        estado_auditoria: estadoAuditada !== "todos" ? estadoAuditada : undefined,
        page,
        page_size: 10,
      };

      const data = await callsService.getHistory(params);

      setData(data);
    } catch (error) {
      console.error("Error al obtener el historial:", error);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, estadoReportada, estadoAuditada, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleClear = () => {
    setEstadoReportada("todos");
    setEstadoAuditada("todos");
    setFechaInicio("");
    setFechaFin("");
    setPage(1);
  };
  return (
    <MainLayout title="Auditoria de Llamadas">
        <Box sx={{ p: 2, marginTop: 2}}>

          <FiltrosyBusquedaBackoffice
            estadoReportada={estadoReportada}
            setEstadoReportada={setEstadoReportada}
            estadoAuditada={estadoAuditada}
            setEstadoAuditada={setEstadoAuditada}
            fechaInicio={fechaInicio}
            setFechaInicio={setFechaInicio}
            fechaFin={fechaFin}
            setFechaFin={setFechaFin}
            onRefresh={fetchData}
            onClear={handleClear}
            loading={loading}
          />
          <TablaLllamadasBackoffice llamadas={data.results} loading={loading} page={page} totalPages={data.total_pages} onPageChange={(newPage) => setPage(newPage)} />
        </Box>
    </MainLayout>
  )
}