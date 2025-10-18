// Path: frontend/src/components/teams/EditTeamModal.jsx

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
import { updateEquipo, getCampanasActivas, getAgentesDisponibles } from '@/core/api/equipos';

/**
 * Modal para editar equipo existente
 * Similar a CreateTeamModal pero con datos pre-cargados
 */
const EditTeamModal = ({ open, onClose, onTeamUpdated, equipo }) => {
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

  // Cargar datos iniciales del equipo
  useEffect(() => {
    if (open && equipo) {
      setNombre(equipo.nombre || '');
      setCampanaSeleccionada(equipo.campana_info || null);
      setAgentesSeleccionados(equipo.agentes || []);
      loadCampanasActivas();
      loadAgentesDisponibles('');
    } else {
      resetForm();
    }
  }, [open, equipo]);

  // Búsqueda de agentes con debounce
  useEffect(() => {
    if (!open) return;
    
    const timeoutId = setTimeout(() => {
      loadAgentesDisponibles(searchAgentes);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchAgentes, open]);

  const resetForm = () => {
    setNombre('');
    setCampanaSeleccionada(null);
    setAgentesSeleccionados([]);
    setSearchAgentes('');
    setErrors({});
    setSuccessMessage('');
  };

  const loadCampanasActivas = async () => {
    try {
      setLoadingCampanas(true);
      const response = await getCampanasActivas();
      
      if (response.success) {
        setCampanas(response.campanas || []);
      }
    } catch (err) {
      console.error('[EditTeamModal] Error cargando campañas:', err);
    } finally {
      setLoadingCampanas(false);
    }
  };

  const loadAgentesDisponibles = async (search) => {
    try {
      setLoadingAgentes(true);
      const response = await getAgentesDisponibles(search);
      
      if (response.success) {
        // Incluir agentes actuales del equipo en la lista disponible
        const agentesActualesIds = (equipo?.agentes || []).map(a => a.documento_id);
        const agentesDisponiblesConActuales = [
          ...(equipo?.agentes || []),
          ...(response.agentes || []).filter(a => !agentesActualesIds.includes(a.documento_id))
        ];
        setAgentesDisponibles(agentesDisponiblesConActuales);
      }
    } catch (err) {
      console.error('[EditTeamModal] Error cargando agentes:', err);
    } finally {
      setLoadingAgentes(false);
    }
  };

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

      const response = await updateEquipo(equipo.equipo_id, data);

      if (response.success) {
        setSuccessMessage('El equipo ha sido actualizado');
        
        setTimeout(() => {
          onTeamUpdated();
        }, 1500);
      }
    } catch (err) {
      console.error('[EditTeamModal] Error actualizando equipo:', err);
      
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ general: err.response?.data?.message || 'Error al actualizar el equipo' });
      }
    } finally {
      setLoading(false);
    }
  };

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
          Editar Equipo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Modifica los datos del equipo "{equipo?.nombre}"
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        {errors.general && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.general}
          </Alert>
        )}

        {/* Similar al CreateTeamModal pero con datos pre-cargados */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Nombre del Equipo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            error={!!errors.nombre}
            helperText={errors.nombre}
            disabled={loading || !!successMessage}
            required
          />
        </Box>

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
          />
        </Box>

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
                label="Agentes"
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
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  key={option.documento_id}
                  label={option.full_name}
                  {...getTagProps({ index })}
                  size="small"
                  deleteIcon={<CloseIcon />}
                />
              ))
            }
          />
          {errors.agentes && (
            <FormHelperText error>{errors.agentes}</FormHelperText>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={loading || !!successMessage}
          variant="outlined"
        >
          {successMessage ? 'Cerrar' : 'Cancelar'}
        </Button>
        
        {!successMessage && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EditTeamModal;
