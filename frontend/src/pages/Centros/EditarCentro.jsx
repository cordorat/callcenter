//Path: frontend/src/pages/Centros/EditarCentro.jsx
//Componente para editar un centro existente - Solo ADMIN

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Alert,
  FormHelperText,
  Divider,
  Chip
} from '@mui/material';
import { PersonOff as PersonOffIcon } from '@mui/icons-material';
import { centrosService } from '@/core/api/centros';
import { useTheme } from '@mui/material/styles';

/**
 * Componente para editar centros existentes (solo administradores)
 */
export default function EditarCentro({ centro, onCentroUpdated, onCancel }) {
  const theme = useTheme();
  
  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
    jefe_centro: ""
  });

  const [jefesDisponibles, setJefesDisponibles] = useState([]);
  const [loadingJefes, setLoadingJefes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Cargar datos del centro al montar el componente
  useEffect(() => {
    if (centro) {
      setFormData({
        nombre: centro.nombre || "",
        direccion: centro.direccion || "",
        jefe_centro: centro.jefe_centro || ""
      });
    }
  }, [centro]);

  // Cargar jefes disponibles
  useEffect(() => {
    fetchJefesDisponibles();
  }, []);

  const fetchJefesDisponibles = async () => {
    try {
      setLoadingJefes(true);
      const data = await centrosService.getJefesDisponibles();
      setJefesDisponibles(data || []);
    } catch (err) {
      console.error('Error al cargar jefes disponibles:', err);
      setJefesDisponibles([]);
    } finally {
      setLoadingJefes(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre || !formData.nombre.trim()) {
      newErrors.nombre = "El nombre del centro es obligatorio";
    }

    if (!formData.direccion || !formData.direccion.trim()) {
      newErrors.direccion = "La dirección es obligatoria";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const centroData = {
        nombre: formData.nombre.trim(),
        direccion: formData.direccion.trim(),
      };

      // Manejar jefe_centro: null para desasignar, documento_id para asignar
      if (formData.jefe_centro === "" || formData.jefe_centro === null) {
        centroData.jefe_centro = null;
      } else {
        centroData.jefe_centro = formData.jefe_centro;
      }

      const response = await centrosService.updateCentro(centro.id, centroData);

      setSuccessMessage(response.message || 'Centro actualizado correctamente');

      setTimeout(() => {
        if (typeof onCentroUpdated === 'function') {
          onCentroUpdated();
        }
      }, 1500);
    } catch (error) {
      console.error("Error al actualizar centro:", error);

      if (error.response?.data) {
        const backendErrors = error.response.data;
        const formErrors = {};
        Object.keys(backendErrors).forEach(key => {
          if (Array.isArray(backendErrors[key])) {
            formErrors[key] = backendErrors[key][0];
          } else if (typeof backendErrors[key] === 'string') {
            formErrors[key] = backendErrors[key];
          }
        });
        setErrors(formErrors);
      } else {
        setErrors({ general: 'Error al actualizar el centro. Intente nuevamente.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
  };

  // Construir lista de jefes para el select
  // Incluir el jefe actual del centro si existe (para que aparezca en la lista)
  const opcionesJefes = [...jefesDisponibles];
  
  // Si el centro tiene un jefe asignado, agregarlo a las opciones si no está
  if (centro?.jefe_centro && centro?.jefe_centro_nombre) {
    const jefeActualEnLista = opcionesJefes.some(j => j.documento_id === centro.jefe_centro);
    if (!jefeActualEnLista) {
      opcionesJefes.unshift({
        documento_id: centro.jefe_centro,
        full_name: centro.jefe_centro_nombre,
        email: centro.jefe_centro_email || ''
      });
    }
  }

  return (
    <Dialog
      open={true}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        elevation: 2,
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Editar Centro
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        {/* Mensaje de éxito */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        {/* Mensaje de error general */}
        {errors.general && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.general}
          </Alert>
        )}

        {/* Info del centro actual */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            ID del Centro: <strong>{centro?.id}</strong>
          </Typography>
        </Box>

        {/* Nombre */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Nombre del centro *"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            error={!!errors.nombre}
            helperText={errors.nombre}
            disabled={loading}
          />
        </Box>

        {/* Dirección */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Dirección *"
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
            error={!!errors.direccion}
            helperText={errors.direccion}
            disabled={loading}
            multiline
            rows={2}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Jefe de Centro */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth error={!!errors.jefe_centro}>
            <InputLabel>Jefe de Centro</InputLabel>
            <Select
              name="jefe_centro"
              value={formData.jefe_centro || ""}
              onChange={handleChange}
              label="Jefe de Centro"
              disabled={loading || loadingJefes}
            >
              <MenuItem value="">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonOffIcon fontSize="small" color="warning" />
                  <em>Sin asignar</em>
                </Box>
              </MenuItem>
              {opcionesJefes.map((jefe) => (
                <MenuItem key={jefe.documento_id} value={jefe.documento_id}>
                  {jefe.full_name} {jefe.email && `(${jefe.email})`}
                  {centro?.jefe_centro === jefe.documento_id && (
                    <Chip 
                      label="Actual" 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 1, height: 20 }} 
                    />
                  )}
                </MenuItem>
              ))}
            </Select>
            {errors.jefe_centro && (
              <FormHelperText>{errors.jefe_centro}</FormHelperText>
            )}
            {opcionesJefes.length === 0 && !loadingJefes && !centro?.jefe_centro && (
              <FormHelperText>
                No hay usuarios con rol "Jefe de Centro" disponibles
              </FormHelperText>
            )}
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button
          onClick={handleCancel}
          disabled={loading}
          sx={{
            backgroundColor: theme.palette.primary.secondary,
            color: 'white',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: theme.palette.primary.secondary,
              opacity: 0.9
            }
          }}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{
            textTransform: 'none',
          }}
          onClick={handleSubmit}
        >
          {loading ? <CircularProgress size={20} /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
