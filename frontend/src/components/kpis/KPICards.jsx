import React from 'react';
import { useTheme } from '@mui/material/styles';
import './KPICards.css';

/**
 * Tarjeta individual de KPI
 */
function KPICard({ label, value, formattedValue, icon, status }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <div className={`kpi-card-container ${status || ''}`}>
      {icon && <div className="kpi-icon">{icon}</div>}
      <div className="kpi-content">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{formattedValue || value}</div>
      </div>
    </div>
  );
}

/**
 * Componente que renderiza múltiples tarjetas de KPI
 */
export default function KPICards({ kpiData, loading }) {
  const theme = useTheme();

  if (loading) {
    return (
      <div className="kpi-cards-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="kpi-card-container skeleton">
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        ))}
      </div>
    );
  }

  if (!kpiData) {
    return null;
  }

  // Formatear valores
  const formatSeconds = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="kpi-cards-grid">
      {/* Llamadas */}
      <KPICard
        label="Llamadas Atendidas"
        value={kpiData.total_llamadas}
        formattedValue={kpiData.total_llamadas}
      />

      {/* Ventas */}
      <KPICard
        label="Ventas Realizadas"
        value={kpiData.ventas_realizadas}
        formattedValue={kpiData.ventas_realizadas}
      />

      {/* Tasa de Conversión */}
      <KPICard
        label="Tasa de Conversión"
        value={kpiData.tasa_conversion}
        formattedValue={`${kpiData.tasa_conversion.toFixed(2)}%`}
      />

      {/* Tiempo Trabajado */}
      <KPICard
        label="Tiempo Trabajado"
        value={kpiData.tiempo_trabajado_segundos}
        formattedValue={kpiData.tiempo_trabajado_formateado}
      />

      {/* Duración Promedio */}
      <KPICard
        label="Duración Promedio"
        value={kpiData.duracion_promedio_segundos}
        formattedValue={kpiData.duracion_promedio_formateado}
      />

    </div>
  );
}
