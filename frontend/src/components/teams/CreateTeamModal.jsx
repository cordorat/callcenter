// Path: frontend/src/components/teams/CreateTeamModal.jsx

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Autocomplete,
  Chip,
  Alert,
  CircularProgress,
  FormHelperText
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { createEquipo, getCampanasActivas, getAgentesDisponibles } from '@/core/api/equipos';

/**
 * Modal para crear nuevo equipo de trabajo
 * Criterios implementados:
 * - 2.1: Botón "Crear Equipo" (padre)
 * - 2.2: Búsqueda en tiempo real de agentes y campañas
 * - 3.1: Botón "Guardar"
 * - 3.1.1: Mensaje "El equipo ha sido creado"
 * - 3.2: Botón "Volver"
 * - 4.1: Validación de campos requeridos
 * - 4.2: No repetir agentes
 * - 4.3: Validación de agente en otro equipo (backend)
 * - 4.4: Solo campañas activas
 */
const CreateTeamModal = ({ open, onClose, onTeamCreated }) => {
  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [campanaSeleccionada, setCampanaSeleccionada] = useState(null);
  const [agentesSeleccionados, setAgentesSeleccionados] = useState([]);
  
  // Estados de datos
  const [campanas, setCampanas] = useState([]);
  const [agentesDisponibles, setAgentesDisponibles] = useState([]);
  const [searchAgentes, setSearchAgentes] = useState('');
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [loadingCampanas, setLoadingCampanas] = useState(false);
  const [loadingAgentes, setLoadingAgentes] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Cargar campañas activas al abrir el modal
  useEffect(() => {
    if (open) {
      loadCampanasActivas();
      loadAgentesDisponibles('');
    } else {
      // Limpiar formulario al cerrar
      resetForm();
    }
  }, [open]);

  // Búsqueda de agentes con debounce
  useEffect(() => {
    if (!open) return;
    
    const timeoutId = setTimeout(() => {
      loadAgentesDisponibles(searchAgentes);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchAgentes, open]);

  /**
   * Resetea el formulario
   */
  const resetForm = () => {
    setNombre('');
    setCampanaSeleccionada(null);
    setAgentesSeleccionados([]);
    setSearchAgentes('');
    setErrors({});
    setSuccessMessage('');
  };

  /**
   * Criterio 4.4: Carga solo campañas con estado ACTIVA
   * Criterio 2.2: Carga asíncrona de datos
   */
  const loadCampanasActivas = async () => {
    try {
      setLoadingCampanas(true);
      const response = await getCampanasActivas();
      
      if (response.success) {
        setCampanas(response.campanas || []);
      }
    } catch (err) {
      console.error('[CreateTeamModal] Error cargando campañas:', err);
      setErrors(prev => ({ ...prev, general: 'Error al cargar las campañas activas' }));
    } finally {
      setLoadingCampanas(false);
    }
  };

  /**
   * Criterio 2.2: Búsqueda en tiempo real de agentes disponibles
   * Criterio 4.3: Solo muestra agentes sin equipo activo (backend filtra)
   */
  const loadAgentesDisponibles = async (search) => {
    try {
      setLoadingAgentes(true);
      const response = await getAgentesDisponibles(search);
      
      if (response.success) {
        setAgentesDisponibles(response.agentes || []);
      }
    } catch (err) {
      console.error('[CreateTeamModal] Error cargando agentes:', err);
    } finally {
      setLoadingAgentes(false);
    }
  };

  /**
   * Valida el formulario antes de enviar
   * Criterio 4.1: Todos los campos son obligatorios
   * Criterio 4.2: No repetir agentes
   */
  const validateForm = () => {
    const newErrors = {};

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre del equipo es obligatorio';
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!campanaSeleccionada) {
      newErrors.campana = 'Debe seleccionar una campaña';
    }

    if (agentesSeleccionados.length === 0) {
      newErrors.agentes = 'Debe seleccionar al menos un agente';
    }

    // Criterio 4.2: Verificar duplicados (aunque el Autocomplete ya lo previene)
    const uniqueIds = new Set(agentesSeleccionados.map(a => a.documento_id));
    if (uniqueIds.size !== agentesSeleccionados.length) {
      newErrors.agentes = 'No se puede repetir el mismo agente';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Maneja el envío del formulario
   * Criterio 3.1: Botón "Guardar"
   * Criterio 3.1.1: Muestra mensaje "El equipo ha sido creado"
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setErrors({});

      const data = {
        nombre: nombre.trim(),
        campana: campanaSeleccionada.id,
        agentes_ids: agentesSeleccionados.map(a => a.documento_id)
      };

      const response = await createEquipo(data);

      if (response.success) {
        // Criterio 3.1.1: Mensaje de éxito
        setSuccessMessage('El equipo ha sido creado');
        
        // Esperar 1.5 segundos para mostrar el mensaje antes de cerrar
        setTimeout(() => {
          onTeamCreated();
        }, 1500);
      }
    } catch (err) {
      console.error('[CreateTeamModal] Error creando equipo:', err);
      
      // Mostrar errores del backend
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ general: err.response?.data?.message || 'Error al crear el equipo' });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Criterio 3.2: Botón "Volver" o "Cancelar"
   */
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Crear Nuevo Equipo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Asigna agentes disponibles a una campaña activa
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Mensaje de éxito - Criterio 3.1.1 */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        {/* Error general */}
        {errors.general && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.general}
          </Alert>
        )}

        {/* Campo: Nombre del equipo */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Nombre del Equipo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            error={!!errors.nombre}
            helperText={errors.nombre}
            placeholder="Ej: Equipo Ventas Alpha"
            disabled={loading || !!successMessage}
            required
          />
        </Box>

        {/* Campo: Campaña - Criterio 4.4 */}
        <Box sx={{ mb: 3 }}>
          <Autocomplete
            options={campanas}
            getOptionLabel={(option) => option.nombre || ''}
            value={campanaSeleccionada}
            onChange={(event, newValue) => {
              setCampanaSeleccionada(newValue);
              setErrors(prev => ({ ...prev, campana: null }));
            }}
            loading={loadingCampanas}
            disabled={loading || !!successMessage}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Campaña Activa"
                error={!!errors.campana}
                helperText={errors.campana}
                required
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingCampanas ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box>
                  <Typography variant="body2">{option.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.descripcion}
                  </Typography>
                </Box>
              </li>
            )}
          />
        </Box>

        {/* Campo: Agentes disponibles - Criterio 2.2 */}
        <Box sx={{ mb: 2 }}>
          <Autocomplete
            multiple
            options={agentesDisponibles}
            getOptionLabel={(option) => option.full_name || ''}
            value={agentesSeleccionados}
            onChange={(event, newValue) => {
              setAgentesSeleccionados(newValue);
              setErrors(prev => ({ ...prev, agentes: null }));
            }}
            inputValue={searchAgentes}
            onInputChange={(event, newInputValue) => {
              setSearchAgentes(newInputValue);
            }}
            loading={loadingAgentes}
            disabled={loading || !!successMessage}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Agentes Disponibles"
                placeholder="Buscar por nombre o código..."
                error={!!errors.agentes}
                required
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <SearchIcon sx={{ ml: 1, mr: 0.5, color: 'text.secondary' }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {loadingAgentes ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box>
                  <Typography variant="body2">{option.full_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.email} • Código: {option.codigo_agente || 'N/A'}
                  </Typography>
                </Box>
              </li>
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.full_name}
                  {...getTagProps({ index })}
                  size="small"
                  deleteIcon={<CloseIcon />}
                />
              ))
            }
            noOptionsText={
              searchAgentes 
                ? "No se encontraron agentes disponibles" 
                : "Escribe para buscar agentes"
            }
          />
          {errors.agentes && (
            <FormHelperText error>{errors.agentes}</FormHelperText>
          )}
          {agentesSeleccionados.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {agentesSeleccionados.length} {agentesSeleccionados.length === 1 ? 'agente seleccionado' : 'agentes seleccionados'}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {/* Criterio 3.2: Botón "Volver" */}
        <Button 
          onClick={handleClose}
          disabled={loading || !!successMessage}
        >
          {successMessage ? 'Cerrar' : 'Cancelar'}
        </Button>
        
        {/* Criterio 3.1: Botón "Guardar" */}
        {!successMessage && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateTeamModal;
