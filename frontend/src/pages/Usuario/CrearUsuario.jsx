import { useState } from 'react';
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
  IconButton,
  InputAdornment,
  Typography,
  CircularProgress,
  Alert,
  FormHelperText
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { usersService } from '@/core/api/users';
import { useTheme } from '@mui/material/styles';

export default function CrearUsuario({ onCancel, onUserCreated }) {
  const navigate = useNavigate();
  const theme = useTheme();
  // Permite cerrar el modal si se pasa como prop
  const isModal = typeof onUserCreated === 'function';
  const [showDialog, setShowDialog] = useState(isModal);
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
        documento_id: parseInt(formData.documento_id, 10),
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
        if (isModal && typeof onUserCreated === 'function') {
          onUserCreated();
        } else {
          navigate('/usuarios');
        }
      }, 1000);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      if (error.response && error.response.data) {
        const backendErrors = error.response.data;
        setErrors(backendErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
   if (typeof onCancel === 'function') {
     onCancel(); // Cierra el popup igual que la X
   } else {
     navigate(-1); // Navega hacia atrás si no es un modal
   }
 };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

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
            Crear Nuevo Usuario
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2 }}>
          {successMessage && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {successMessage}
            </Alert>
          )}

          {/* Documento */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Número de documento *"
              name="documento_id"
              type="number"
              value={formData.documento_id}
              onChange={handleChange}
              error={!!errors.documento_id}
              helperText={errors.documento_id}
              disabled={loading}
            />
          </Box>

          {/* Nombre */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Nombre *"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              error={!!errors.first_name}
              helperText={errors.first_name}
              disabled={loading}
            />
          </Box>

          {/* Apellido */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Apellido *"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              error={!!errors.last_name}
              helperText={errors.last_name}
              disabled={loading}
            />
          </Box>

          {/* Email */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Correo electrónico *"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              disabled={loading}
            />
          </Box>

          {/* Teléfono */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Número de teléfono *"
              name="phone"
              type="number"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone}
              disabled={loading}
            />
          </Box>

          {/* Contraseña */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Contraseña *"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password || "8-16 caracteres (M,m,9-0,@$!%*?&)"}
              disabled={loading}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleTogglePassword} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Confirmar Contraseña */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Confirmar Contraseña *"
              name="password_confirm"
              type={showPassword ? "text" : "password"}
              value={formData.password_confirm}
              onChange={handleChange}
              error={!!errors.password_confirm}
              helperText={errors.password_confirm}
              disabled={loading}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleTogglePassword} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Rol */}
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth error={!!errors.role}>
              <InputLabel>Rol *</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Rol *"
                disabled={loading}
              >
                <MenuItem value="ADMIN">ADMIN</MenuItem>
                <MenuItem value="COORDINADOR">COORDINADOR</MenuItem>
                <MenuItem value="AGENTE">AGENTE</MenuItem>
                <MenuItem value="JEFE_CAMPANA">JEFE DE CAMPAÑA</MenuItem>
                <MenuItem value="JEFE_CENTRO">JEFE DE CENTRO</MenuItem>
                <MenuItem value="BACKOFFICE">BACKOFFICE</MenuItem>
              </Select>
              {errors.role && (
                <FormHelperText>{errors.role}</FormHelperText>
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

  return (
    <MainLayout>
      <Box>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
          Crear Nuevo Usuario
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 500, mx: 'auto' }}>
          {/* Documento */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Número de documento *"
              name="documento_id"
              type="number"
              value={formData.documento_id}
              onChange={handleChange}
              error={!!errors.documento_id}
              helperText={errors.documento_id}
              disabled={loading}
            />
          </Box>

          {/* Nombre */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Nombre *"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              error={!!errors.first_name}
              helperText={errors.first_name}
              disabled={loading}
            />
          </Box>

          {/* Apellido */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Apellido *"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              error={!!errors.last_name}
              helperText={errors.last_name}
              disabled={loading}
            />
          </Box>

          {/* Email */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Correo electrónico *"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              disabled={loading}
            />
          </Box>

          {/* Teléfono */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Número de teléfono *"
              name="phone"
              type="number"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone}
              disabled={loading}
            />
          </Box>

          {/* Contraseña */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Contraseña *"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password || "8-16 caracteres (M,m,9-0,@$!%*?&)"}
              disabled={loading}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleTogglePassword} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Confirmar Contraseña */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Confirmar Contraseña *"
              name="password_confirm"
              type={showPassword ? "text" : "password"}
              value={formData.password_confirm}
              onChange={handleChange}
              error={!!errors.password_confirm}
              helperText={errors.password_confirm}
              disabled={loading}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleTogglePassword} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Rol */}
          <Box sx={{ mb: 4 }}>
            <FormControl fullWidth error={!!errors.role}>
              <InputLabel>Rol *</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Rol *"
                disabled={loading}
              >
                <MenuItem value="ADMIN">ADMIN</MenuItem>
                <MenuItem value="COORDINADOR">COORDINADOR</MenuItem>
                <MenuItem value="AGENTE">AGENTE</MenuItem>
                <MenuItem value="JEFE_CAMPANA">JEFE DE CAMPAÑA</MenuItem>
                <MenuItem value="JEFE_CENTRO">JEFE DE CENTRO</MenuItem>
                <MenuItem value="BACKOFFICE">BACKOFFICE</MenuItem>
              </Select>
              {errors.role && (
                <FormHelperText>{errors.role}</FormHelperText>
              )}
            </FormControl>
          </Box>

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
