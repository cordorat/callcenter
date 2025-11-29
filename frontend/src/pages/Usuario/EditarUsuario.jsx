import { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Switch,
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

/**
 * Componente para editar usuarios existentes (solo administradores)
 * HU: Yo como [Administrador] Requiero [Actualizar los datos de un Usuario]
 * Para [Mantener su acceso según lo requerido por el call center.]
 */
export default function EditarUsuario({ user, onUserUpdated, onCancel }) {
    const theme = useTheme();
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "",
        is_active: true,
        password: "" // Opcional
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    // Mapeo de roles del backend al frontend (para display)
    const rolesDisplayMap = {
        'ADMIN': 'ADMIN',
        'COORDINADOR': 'COORDINADOR',
        'AGENTE': 'AGENTE',
        'JEFE_CAMPANA': 'JEFE DE CAMPAÑA',
        'JEFE_CENTRO': 'JEFE DE CENTRO',
        'BACKOFFICE': 'BACKOFFICE'
    };

    // Cargar datos del usuario al montar el componente
    useEffect(() => {
        if (user) {
            // Determinar el rol correcto - mantener el formato del backend
            const userRole = user.role || user.rol?.valor || '';
            
            setFormData({
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
                phone: user.phone || "",
                role: userRole,
                is_active: user.is_active !== undefined ? user.is_active : true,
                password: "" // Siempre vacío al inicio
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
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

        // Criterio 2.2: Todos son obligatorios
        if (!formData.first_name?.trim()) {
            newErrors.first_name = "El nombre es obligatorio";
        }

        if (!formData.last_name?.trim()) {
            newErrors.last_name = "El apellido es obligatorio";
        }

        // Criterio 2.2: El correo debe contener el dominio
        if (!formData.email?.trim()) {
            newErrors.email = "El correo electrónico es obligatorio";
        } else if (!/@/.test(formData.email)) {
            newErrors.email = "El correo debe contener un dominio válido";
        } else if (!/\.[a-z]{2,}$/i.test(formData.email)) {
            newErrors.email = "El correo debe contener un dominio válido (ej: usuario@dominio.com)";
        }

        // Criterio 2.2: El teléfono debe contener solo números y contener solo 10 caracteres
        // (o formato internacional con +)
        if (!formData.phone?.trim()) {
            newErrors.phone = "El teléfono es obligatorio";
        } else {
            const phone = formData.phone.trim();

            // Validar formato con código de país (+XX...)
            if (phone.startsWith('+')) {
                const numeroSinMas = phone.substring(1);
                if (!/^\d+$/.test(numeroSinMas)) {
                    newErrors.phone = "El formato con código de país debe ser: +XX seguido de números";
                } else if (numeroSinMas.length < 8 || numeroSinMas.length > 15) {
                    newErrors.phone = "El número con código de país debe tener entre 8 y 15 dígitos";
                }
            }
            // Validar formato sin código de país (solo números)
            else {
                if (!/^\d+$/.test(phone)) {
                    newErrors.phone = "El teléfono debe contener solo números";
                } else if (phone.length !== 10) {
                    newErrors.phone = "El teléfono debe contener exactamente 10 dígitos";
                }
            }
        }

        if (!formData.role) {
            newErrors.role = "El rol es obligatorio";
        }

        // Validar contraseña solo si se proporciona
        // Criterio 2.2: La contraseña deberá tener mínimo 8 caracteres, 
        // una minúscula, una mayúscula, un número y un caracter especial
        if (formData.password) {
            if (formData.password.length < 8) {
                newErrors.password = "La contraseña debe tener al menos 8 caracteres";
            } else if (!/[a-z]/.test(formData.password)) {
                newErrors.password = "La contraseña debe contener al menos una letra minúscula";
            } else if (!/[A-Z]/.test(formData.password)) {
                newErrors.password = "La contraseña debe contener al menos una letra mayúscula";
            } else if (!/\d/.test(formData.password)) {
                newErrors.password = "La contraseña debe contener al menos un número";
            } else if (!/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(formData.password)) {
                newErrors.password = "La contraseña debe contener al menos un carácter especial";
            }
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
            // Preparar datos para enviar
            const userData = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                role: formData.role,
                is_active: formData.is_active
            };

            // Solo incluir contraseña si se proporcionó
            if (formData.password) {
                userData.password = formData.password;
            }

            // Usar documento_id o id del usuario
            const userId = user.documento_id || user.id;

            // Criterio 3.1: Mensaje de éxito "Datos actualizados correctamente"
            const response = await usersService.updateUser(userId, userData);

            setSuccessMessage(response.message || 'Datos actualizados correctamente');

            // Esperar un momento para mostrar el mensaje
            setTimeout(() => {
                if (typeof onUserUpdated === 'function') {
                    onUserUpdated();
                }
            }, 1500);
        } catch (error) {
            console.error("Error al actualizar usuario:", error);

            // Criterio 3.2: Si algún campo está mal diligenciado, 
            // se resaltará en rojo con un mensaje explicativo
            if (error.response?.data) {
                const backendErrors = error.response.data;

                // Convertir errores del backend a formato del formulario
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
                setErrors({ general: 'Error al actualizar el usuario. Intente nuevamente.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        // Criterio 4.1: Si se presiona "Cancelar", no se guardan las modificaciones
        if (typeof onCancel === 'function') {
            onCancel();
        }
    };

    const handleTogglePassword = () => {
        setShowPassword((prev) => !prev);
    };

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
                    Editar Usuario
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
                        type="email"
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
                        label="Teléfono *"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        error={!!errors.phone}
                        helperText={errors.phone || "10 dígitos o formato internacional (+573001234567)"}
                        disabled={loading}
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
                            <FormHelperText error>{errors.role}</FormHelperText>
                        )}
                    </FormControl>
                </Box>

                {/* Contraseña (opcional) */}
                <Box sx={{ mb: 3 }}>
                    <TextField
                        fullWidth
                        label="Nueva Contraseña (opcional)"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
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
                        error={!!errors.password}
                        helperText={errors.password || "Dejar vacío para mantener la actual"}
                        disabled={loading}
                    />
                </Box>

                {/* Estado activo/inactivo */}
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography>Usuario activo</Typography>
                    <Switch
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        color="primary"
                        disabled={loading}
                    />
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
