import React from 'react';
import { TextField, Stack, Alert, useTheme } from '@mui/material';
import { getDateInputSx, getDateInputLabelProps } from '@/core/styles/dateInputStyles';

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
  const theme = useTheme();
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
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label="Desde"
          type="date"
          value={fechaDesde}
          onChange={handleDesdeChange}
          disabled={disabled}
          InputLabelProps={getDateInputLabelProps(theme)}
          sx={getDateInputSx(theme)}
        />
        <TextField
          label="Hasta"
          type="date"
          value={fechaHasta}
          onChange={handleHastaChange}
          disabled={disabled}
          InputLabelProps={getDateInputLabelProps(theme)}
          sx={getDateInputSx(theme)}
        />
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
