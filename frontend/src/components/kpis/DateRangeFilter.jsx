import React from 'react';
import './DateRangeFilter.css';

/**
 * Componente para filtrar KPIs por rango de fechas.
 * Validaciones:
 * - No se permiten fechas futuras
 * - La fecha desde no puede ser mayor que la fecha hasta
 * - Cambios automáticos al parámetro de URL
 */
export default function DateRangeFilter({
  fechaDesde,
  fechaHasta,
  onDateChange,
  disabled = false
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [error, setError] = React.useState('');

  const handleDesdeChange = (e) => {
    const nuevaFecha = e.target.value;
    
    // Validar que no sea fecha futura
    if (nuevaFecha > hoy) {
      setError('No se pueden elegir fechas futuras');
      return;
    }
    
    // Validar que no sea mayor que fechaHasta
    if (fechaHasta && nuevaFecha > fechaHasta) {
      setError('La fecha inicial no puede ser mayor a la fecha posterior');
      return;
    }
    
    setError('');
    onDateChange({ fechaDesde: nuevaFecha, fechaHasta });
  };

  const handleHastaChange = (e) => {
    const nuevaFecha = e.target.value;
    
    // Validar que no sea fecha futura
    if (nuevaFecha > hoy) {
      setError('No se pueden elegir fechas futuras');
      return;
    }
    
    // Validar que no sea menor que fechaDesde
    if (fechaDesde && nuevaFecha < fechaDesde) {
      setError('La fecha final no puede ser menor a la fecha inicial');
      return;
    }
    
    setError('');
    onDateChange({ fechaDesde, fechaHasta: nuevaFecha });
  };

  return (
    <div className="date-range-filter">
      <div className="date-inputs">
        <div className="date-group">
          <label htmlFor="fecha-desde">Desde</label>
          <input
            id="fecha-desde"
            type="date"
            value={fechaDesde}
            onChange={handleDesdeChange}
            disabled={disabled}
            max={hoy}
          />
        </div>

        <div className="date-group">
          <label htmlFor="fecha-hasta">Hasta</label>
          <input
            id="fecha-hasta"
            type="date"
            value={fechaHasta}
            onChange={handleHastaChange}
            disabled={disabled}
            max={hoy}
          />
        </div>
      </div>

      {error && <div className="date-error">{error}</div>}
    </div>
  );
}
