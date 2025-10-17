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
  const [successMessage, setSuccessMessage] = useState('');


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    
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

    if (!formData.documento_id) {
      newErrors.documento_id = "El documento es requerido";
    }

    if (!formData.first_name) {
      newErrors.first_name = "El nombre es requerido";
    }

    if (!formData.last_name) {
      newErrors.last_name = "El apellido es requerido";
    }

    if (!formData.email) {
      newErrors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Debe tener el formato válido '@dominio.com'";
    }

    if (!formData.phone) {
      newErrors.phone = "El teléfono es requerido";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Debe tener 10 dígitos";
    }

    if (!formData.role) {
      newErrors.role = "El rol es requerido";
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password = "Debe tener el formato valido";
      }
    }

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
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
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

      await usersService.createUser(userData);
      setSuccessMessage('Usuario creado correctamente');
      setTimeout(() => {
        navigate('/usuarios');
      }, 1000);

    } catch (error) {
      console.error("Error al crear usuario:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
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
        {successMessage && (
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              backgroundColor: '#e6f4ea',
              border: '1px solid #2e7d32',
              color: '#2e7d32',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {successMessage}
          </Box>
        )}
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
                type="number"
                value={formData.documento_id}
                onChange={handleChange}
                variant="outlined"
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
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
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
                type="number"
                value={formData.phone}
                onChange={handleChange}
                variant="outlined"
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
                error={!!errors.password}
                helperText={errors.password || "8-16 caracteres (M,m,9-0,@$!%*?&)"}
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
    </MainLayout>
  );
}
