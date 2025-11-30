//Path: frontend/src/pages/Centros/CrearCentro.jsx
//Componente para crear un nuevo centro - Solo ADMIN

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/core/components/layout/MainLayout';
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
  FormHelperText
} from '@mui/material';
import { centrosService } from '@/core/api/centros';
import { useTheme } from '@mui/material/styles';

export default function CrearCentro({ onCancel, onCentroCreated }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isModal = typeof onCentroCreated === 'function';
  const [showDialog, setShowDialog] = useState(isModal);
  
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

  // Cargar jefes disponibles al montar el componente
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
    try {
      const centroData = {
        nombre: formData.nombre.trim(),
        direccion: formData.direccion.trim(),
      };
      
      // Solo incluir jefe_centro si se seleccionó uno
      if (formData.jefe_centro) {
        centroData.jefe_centro = formData.jefe_centro;
      }

      await centrosService.createCentro(centroData);
      setSuccessMessage('Centro creado correctamente');
      
      setTimeout(() => {
        if (isModal && typeof onCentroCreated === 'function') {
          onCentroCreated();
        } else {
          navigate('/centros');
        }
      }, 1000);
    } catch (error) {
      console.error("Error al crear centro:", error);
      if (error.response && error.response.data) {
        const backendErrors = error.response.data;
        // Manejar errores del backend
        const formErrors = {};
        Object.keys(backendErrors).forEach(key => {
          if (Array.isArray(backendErrors[key])) {
            formErrors[key] = backendErrors[key][0];
          } else if (typeof backendErrors[key] === 'string') {
            formErrors[key] = backendErrors[key];
          }
        });
        setErrors(formErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (typeof onCancel === 'function') {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  const formContent = (
    <>
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
          placeholder="Ej: Centro Norte, Sede Principal..."
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
          placeholder="Ej: Calle 100 #15-20, Bogotá"
        />
      </Box>

      {/* Jefe de Centro (opcional) */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth error={!!errors.jefe_centro}>
          <InputLabel>Jefe de Centro (opcional)</InputLabel>
          <Select
            name="jefe_centro"
            value={formData.jefe_centro}
            onChange={handleChange}
            label="Jefe de Centro (opcional)"
            disabled={loading || loadingJefes}
          >
            <MenuItem value="">
              <em>Sin asignar</em>
            </MenuItem>
            {jefesDisponibles.map((jefe) => (
              <MenuItem key={jefe.documento_id} value={jefe.documento_id}>
                {jefe.full_name} ({jefe.email})
              </MenuItem>
            ))}
          </Select>
          {errors.jefe_centro && (
            <FormHelperText>{errors.jefe_centro}</FormHelperText>
          )}
          {jefesDisponibles.length === 0 && !loadingJefes && (
            <FormHelperText>
              No hay usuarios con rol "Jefe de Centro" disponibles
            </FormHelperText>
          )}
        </FormControl>
      </Box>
    </>
  );

  if (isModal) {
    return (
      <Dialog
        open={showDialog}
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
            Crear Nuevo Centro
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2 }}>
          {formContent}
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

  return (
    <MainLayout>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
          Crear Nuevo Centro
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 500, mx: 'auto' }}>
          {formContent}

          {/* Botones */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              sx={{
                textTransform: 'none',
                backgroundColor: theme.palette.primary.secondary,
                color: 'white',
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
            >
              {loading ? <CircularProgress size={20} /> : 'Guardar'}
            </Button>
          </Box>
        </Box>
      </Box>
    </MainLayout>
  );
}
