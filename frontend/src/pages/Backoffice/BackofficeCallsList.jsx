import TablaLllamadasBackoffice from "@/components/backoffice/tablelist";
import FiltrosyBusquedaBackoffice from "@/components/backoffice/SearchAndFiltersBackoffice";
import { callsService } from "@/core/api/calls";
import MainLayout from "@/core/components/layout/MainLayout";
import React, { useState, useCallback, useEffect } from "react";
import { Box } from "@mui/material";
export default function BackofficeCallsList() {
  const [data, setData] = useState({ total_pages: 1 });
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estadoReportada, setEstadoReportada] = useState("");
  const [estadoAuditada, setEstadoAuditada] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        fecha_desde: fechaInicio || undefined,
        fecha_hasta: fechaFin || undefined,
        estado_reportada: estadoReportada || undefined,
        estado_auditoria: estadoAuditada || undefined,
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
    setEstadoReportada("");
    setEstadoAuditada("");
    setFechaInicio("");
    setFechaFin("");
    setPage(1);
  };
  return (
    <MainLayout title="Listado de Llamadas Backoffice">
        <Box sx={{ p: 2 }}>
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