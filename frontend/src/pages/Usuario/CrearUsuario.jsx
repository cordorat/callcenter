import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/core/components/layout/MainLayout';
import {
  Box,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Checkbox,
  IconButton,
  InputAdornment,
  Grid,
  Paper,
  Typography,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { usersService } from '@/core/api/users';

export default function CrearUsuario() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    documento_id: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "",
    password: "",
    password_confirm: "",
    phone: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    
    // Limpiar error del campo modificado
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

    // Validación de documento
    if (!formData.documento_id) {
      newErrors.documento_id = "El documento es requerido";
    }

    // Validación de nombre
    if (!formData.first_name) {
      newErrors.first_name = "El nombre es requerido";
    }

    // Validación de apellido
    if (!formData.last_name) {
      newErrors.last_name = "El apellido es requerido";
    }

    // Validación de email - Formato @dominio.com
    if (!formData.email) {
      newErrors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "El correo debe tener el formato válido '@dominio.com'";
    }

    // Validación de teléfono - Exactamente 10 números
    if (!formData.phone) {
      newErrors.phone = "El teléfono es requerido";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "El teléfono debe tener exactamente 10 números";
    }

    // Validación de rol
    if (!formData.role) {
      newErrors.role = "El rol es requerido";
    }

    // Validación de contraseña - 8-16 caracteres, mayúscula, minúscula, número y carácter especial
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password = "La contraseña debe tener 8-16 caracteres, incluyendo mayúscula, minúscula, número y carácter especial (@$!%*?&)";
      }
    }

    // Validación de confirmación de contraseña
    if (!formData.password_confirm) {
      newErrors.password_confirm = "Debes confirmar la contraseña";
    } else if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = "Las contraseñas no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSnackbar({
        open: true,
        message: 'Por favor, corrige los errores en el formulario',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    
    try {
      // Preparar datos para enviar al backend (sin foto_perfil ni is_active)
      const userData = {
        documento_id: formData.documento_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: formData.role,
        password: formData.password,
        password_confirm: formData.password_confirm,
        phone: formData.phone
      };

      const response = await usersService.createUser(userData);
      
      setSnackbar({
        open: true,
        message: 'Usuario creado exitosamente',
        severity: 'success'
      });

      // Limpiar formulario después de 1.5 segundos y redirigir
      setTimeout(() => {
        navigate('/usuarios'); // Ajusta la ruta según tu aplicación
      }, 1500);

    } catch (error) {
      console.error("Error al crear usuario:", error);
      
      let errorMessage = 'Error al crear el usuario';
      
      if (error.response?.data) {
        // Si hay errores específicos del backend, mostrarlos
        const backendErrors = error.response.data;
        
        if (typeof backendErrors === 'object' && !Array.isArray(backendErrors)) {
          setErrors(backendErrors);
          errorMessage = 'Por favor, corrige los errores señalados';
        } else if (backendErrors.detail) {
          errorMessage = backendErrors.detail;
        } else if (typeof backendErrors === 'string') {
          errorMessage = backendErrors;
        }
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); // Volver a la página anterior
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <MainLayout title="Crear Usuario">
      <Paper
        elevation={4}
        sx={{
          p: 5,
          maxWidth: 900,
          mx: "auto",
          mt: 6,
          borderRadius: 4,
          bgcolor: "#fafafa",
        }}
      >
        <Typography variant="h5" fontWeight="bold" mb={3} textAlign="center">
          Ingresa los datos del nuevo usuario
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3} justifyContent="flex-start">
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Número de documento"
                name="documento_id"
                type="text"
                value={formData.documento_id}
                onChange={handleChange}
                variant="outlined"
                required
                error={!!errors.documento_id}
                helperText={errors.documento_id}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Primer nombre"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                variant="outlined"
                required
                error={!!errors.first_name}
                helperText={errors.first_name}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellido"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                variant="outlined"
                required
                error={!!errors.last_name}
                helperText={errors.last_name}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Correo electrónico"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
                required
                error={!!errors.email}
                helperText={errors.email}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Número de teléfono"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                variant="outlined"
                required
                error={!!errors.phone}
                helperText={errors.phone}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contraseña"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleTogglePassword} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
                required
                error={!!errors.password}
                helperText={errors.password || "8-16 caracteres, con mayúscula, minúscula, número y carácter especial"}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirmar Contraseña"
                name="password_confirm"
                type={showPassword ? "text" : "password"}
                value={formData.password_confirm}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleTogglePassword} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
                required
                error={!!errors.password_confirm}
                helperText={errors.password_confirm}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} sx={{ fontSize: '1.2rem', minWidth: '250px' }}>
              <FormControl fullWidth error={!!errors.role}>
                <InputLabel>Rol</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  label="Rol"
                  required
                  disabled={loading}
                >
                  <MenuItem value="ADMIN">ADMIN</MenuItem>
                  <MenuItem value="COORDINADOR">COORDINADOR</MenuItem>
                  <MenuItem value="AGENTE">AGENTE</MenuItem>
                  <MenuItem value="JEFE DE CAMPAÑA">JEFE DE CAMPAÑA</MenuItem>
                  <MenuItem value="JEFE DE CENTRO">JEFE DE CENTRO</MenuItem>
                  <MenuItem value="BACKOFFICE">BACKOFFICE</MenuItem>
                </Select>
                {errors.role && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                    {errors.role}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} display="flex" alignItems="center">
              <FormControlLabel
                control={<Checkbox name="activo" checked={true} />}
                label="Usuario activo"
              />
            </Grid>
          </Grid>
            <Grid container spacing={2} mt={3} display="flex" justifyContent="center">
              <Grid item xs={12} sm={6} textAlign="center">
                <Button 
                  type="button" 
                  variant="outlined" 
                  color="secondary" 
                  size="large" 
                  onClick={handleCancel}
                  disabled={loading}
                  sx={{
                    width:"100%",
                    borderRadius:2,
                    py: 1.5, 
                    fontSize: '1rem',
                    fontWeight: "bold"
                  }}
                >
                  Cancelar
                </Button>
              </Grid>            
              <Grid item xs={12} sm={6} textAlign="center">
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  size="large" 
                  disabled={loading}
                  sx={{
                    width:"100%",
                    borderRadius:2,
                    py: 1.5, 
                    fontSize: '1rem',
                    fontWeight: "bold"
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Guardar'}
                </Button>
              </Grid>
            </Grid>
        </Box>
      </Paper>

      {/* Snackbar para mensajes de éxito/error */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}
