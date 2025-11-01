import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/core/components/layout/MainLayout';
import { useAuth } from '@/core/context/AuthContext';
import { usersService } from '@/core/api/users';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  CircularProgress,
  Alert,
  Avatar,
  Grid,
  IconButton,
  Divider,
  useTheme,
  Container,
  Tabs,
  Tab,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { InputAdornment } from '@mui/material';

export default function ProfilePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = React.useRef(null);

  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    foto_perfil: user?.foto_perfil || '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  // Estados para mostrar/ocultar contraseñas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleEditClick = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      foto_perfil: user?.foto_perfil || '',
    });
    setEditMode(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditMode(false);
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          foto_perfil: event.target?.result || '',
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await usersService.updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        foto_perfil: formData.foto_perfil,
      });

      setSuccess('Perfil actualizado exitosamente');
      setTimeout(() => {
        setEditMode(false);
        refreshUser();
        setSuccess('');
      }, 1500);
    } catch (err) {
      const errorData = err.response?.data;

      if (errorData) {
        if (typeof errorData === 'object' && !errorData.message) {
          // Formatear errores de campo específicos
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => {
              const fieldName = {
                first_name: 'Nombre',
                last_name: 'Apellido',
                phone: 'Teléfono',
                email: 'Email'
              }[field] || field;
              return `${fieldName}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
            })
            .join('\n');
          setError(errorMessages);
        } else {
          setError(errorData.message || 'Error al actualizar el perfil');
        }
      } else {
        setError('Error al actualizar el perfil');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await usersService.changePassword({
        old_password: passwordData.current_password,
        new_password: passwordData.new_password,
        new_password_confirm: passwordData.confirm_password,
      });

      setSuccess('Contraseña actualizada exitosamente');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });

      setTimeout(() => {
        setSuccess('');
      }, 1500);
    } catch (err) {
      // El backend devuelve errores específicos por campo
      const errorData = err.response?.data;

      // Si hay errores de validación, mostrarlos
      if (errorData) {
        if (typeof errorData === 'object' && !errorData.message) {
          // Formatear errores de campo específicos
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => {
              const fieldName = {
                old_password: 'Contraseña actual',
                new_password: 'Nueva contraseña',
                new_password_confirm: 'Confirmar contraseña'
              }[field] || field;
              return `${fieldName}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
            })
            .join('\n');
          setError(errorMessages);
        } else {
          setError(errorData.message || 'Error al cambiar la contraseña');
        }
      } else {
        setError('Error al cambiar la contraseña');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <MainLayout title="Mi Perfil">
      <Box sx={{ py: 4 }}>
        <Container maxWidth="lg">
          {/* Header simple */}
          <Box sx={{ mb: 4 }}>
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/configuracion')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '14px',
                color: theme.palette.text.secondary,
                '&:hover': {
                  color: theme.palette.primary.main,
                  backgroundColor: 'transparent',
                },
              }}
            >
              Volver a Configuración
            </Button>

            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={editMode && tabValue === 0 ? formData.foto_perfil : user?.foto_perfil}
                  alt={user?.full_name || 'Usuario'}
                  sx={{
                    width: 80,
                    height: 80,
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    backgroundColor: theme.palette.primary.main,
                  }}
                >
                  {!(editMode && tabValue === 0 ? formData.foto_perfil : user?.foto_perfil) &&
                    user?.first_name?.charAt(0)}
                  {!(editMode && tabValue === 0 ? formData.foto_perfil : user?.foto_perfil) &&
                    user?.last_name?.charAt(0)}
                </Avatar>

                {editMode && tabValue === 0 && (
                  <IconButton
                    onClick={handlePhotoClick}
                    size="small"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: theme.palette.primary.main,
                      color: '#fff',
                      '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                      },
                      width: 36,
                      height: 36,
                    }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
              </Box>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoChange}
              />

              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {user?.full_name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {user?.email}
                </Typography>
              </Box>

              {!editMode && tabValue === 0 && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleEditClick}
                  sx={{
                    ml: 'auto',
                    minWidth: 0,
                    padding: '6px',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                  }}
                >
                  <EditIcon />
                </Button>
              )}
            </Box>
          </Box>

          {/* Alertas de error/éxito */}
          {(error || success) && (
            <Box sx={{ mb: 3 }}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            </Box>
          )}

          {/* Tabs */}
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                sx={{
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  px: 3,
                }}
              >
                <Tab label="Información Personal" />
                <Tab label="Cambiar Contraseña" />
              </Tabs>

              {tabValue === 0 && (
                <Box sx={{ p: 3 }}>
                  {editMode ? (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                        Editar Información Personal
                      </Typography>

                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Nombre"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            disabled={loading}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Apellido"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            disabled={loading}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Teléfono"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            disabled={loading}
                          />
                        </Grid>
                      </Grid>

                      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                        <Button
                          variant="contained"
                          onClick={handleSave}
                          disabled={loading}
                          fullWidth
                          size="large"
                        >
                          {loading ? <CircularProgress size={20} /> : 'Guardar'}
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={handleCancel}
                          disabled={loading}
                          fullWidth
                          size="large"
                        >
                          Cancelar
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                        Información Personal
                      </Typography>

                      <Grid container spacing={4}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ mb: 3 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                              }}
                            >
                              Correo Electrónico
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1, fontWeight: 500 }}>
                              {user?.email}
                            </Typography>
                          </Box>

                          <Box sx={{ mb: 3 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                              }}
                            >
                              Teléfono
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1, fontWeight: 500 }}>
                              {user?.phone || 'No configurado'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Box sx={{ mb: 3 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                              }}
                            >
                              Documento de Identidad
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1, fontWeight: 500 }}>
                              {user?.documento_id || 'No configurado'}
                            </Typography>
                          </Box>

                          <Box sx={{ mb: 3 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                              }}
                            >
                              Rol
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1, fontWeight: 500 }}>
                              {user?.role === 'ADMIN' ? 'Administrador' : user?.role || 'Sin rol'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 3 }} />

                      <Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                          }}
                        >
                          Última Actualización
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                          {formatDate(user?.updated_at)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              {tabValue === 1 && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Cambiar Contraseña
                  </Typography>

                  <Grid container spacing={3} sx={{ maxWidth: 600 }}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type={showCurrentPassword ? "text" : "password"}
                        label="Contraseña Actual"
                        name="current_password"
                        value={passwordData.current_password}
                        onChange={handlePasswordChange}
                        disabled={loading}
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="toggle password visibility"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                  edge="end"
                                  size="small"
                                >
                                  {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type={showNewPassword ? "text" : "password"}
                        label="Nueva Contraseña"
                        name="new_password"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        disabled={loading}
                        helperText="Mínimo 6 caracteres"
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="toggle password visibility"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  edge="end"
                                  size="small"
                                >
                                  {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type={showConfirmPassword ? "text" : "password"}
                        label="Confirmar Nueva Contraseña"
                        name="confirm_password"
                        value={passwordData.confirm_password}
                        onChange={handlePasswordChange}
                        disabled={loading}
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="toggle password visibility"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  edge="end"
                                  size="small"
                                >
                                  {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                    <Button
                      variant="contained"
                      onClick={handleChangePassword}
                      disabled={
                        loading ||
                        !passwordData.current_password ||
                        !passwordData.new_password ||
                        !passwordData.confirm_password
                      }
                      fullWidth
                      size="large"
                    >
                      {loading ? <CircularProgress size={20} /> : 'Actualizar Contraseña'}
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
    </MainLayout>
  );
}