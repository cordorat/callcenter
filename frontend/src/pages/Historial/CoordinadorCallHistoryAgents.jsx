import MainLayout from "@/core/components/layout/MainLayout";
import { Box } from "@mui/material";
import { useEffect, useState, useCallback} from "react";
import TablaLlamadas from "@/components/history/CallHistoryAgents";
import FiltrosyBusqueda from "../../components/history/SearchAndFilters";
import { callsService } from "@/core/api/calls";

// Función helper para convertir Date a formato YYYY-MM-DD
const toYMD = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export default function CoordinadorCallHistoryAgents() {
  const today = toYMD(new Date());
  const [data, setData] = useState({ total_pages: 1 });
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState(""); 
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        fecha_desde: fechaInicio || undefined,
        fecha_hasta: fechaFin || undefined,
        estado: estado || undefined,
        page,
        page_size: 10,
      };

      // Si hay búsqueda, determinar si es número (teléfono) o texto (nombre agente)
      if (busqueda) {
        const esNumero = /^\d+$/.test(busqueda.trim());
        if (esNumero) {
          params.telefono = busqueda.trim();
        } else {
          params.agente_nombre = busqueda.trim();
        }
      }

      const data = await callsService.getHistory(params);

      setData(data);
    } catch (error) {
      console.error("Error al obtener el historial:", error);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, estado, busqueda, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleClear = () => {
    setBusqueda("");
    setEstado("");
    setFechaInicio(today);
    setFechaFin(today);
    setPage(1);
  };
  return (
    <MainLayout title="Historial de Llamadas del Equipo">
        <Box sx={{ p: 2 }}>
          <FiltrosyBusqueda
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            estado={estado}
            setEstado={setEstado}
            fechaInicio={fechaInicio}
            setFechaInicio={setFechaInicio}
            fechaFin={fechaFin}
            setFechaFin={setFechaFin}
            onRefresh={fetchData}
            onClear={handleClear}
            loading={loading}
          />
          <TablaLlamadas llamadas={data.results} loading={loading} page={page} totalPages={data.total_pages} onPageChange={(newPage) => setPage(newPage)} />
        </Box>
    </MainLayout>
  )
}