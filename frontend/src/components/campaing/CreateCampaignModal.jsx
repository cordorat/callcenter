// Path: frontend/src/components/campaing/CreateCampaignModal.jsx

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
    Alert,
    CircularProgress,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    Search as SearchIcon,
} from '@mui/icons-material';
import {
    createCampaign,
    searchJefesCampana,
    getProductosActivos
} from '@/core/api/campaigns';

/**
 * Modal para crear nueva campaña
 */
const CreateCampaignModal = ({ open, onClose, onCampaignCreated }) => {

    // Estados del formulario
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [estadoActivo, setEstadoActivo] = useState(true); // Por defecto Activa
    const [jefeCampanaSeleccionado, setJefeCampanaSeleccionado] = useState(null);
    const [productosSeleccionados, setProductosSeleccionados] = useState([]);

    // Estados de datos
    const [jefesCampana, setJefesCampana] = useState([]);
    const [productos, setProductos] = useState([]);
    const [searchJefes, setSearchJefes] = useState('');

    // Estados de UI
    const [loading, setLoading] = useState(false);
    const [loadingJefes, setLoadingJefes] = useState(false);
    const [loadingProductos, setLoadingProductos] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    // Cargar productos al abrir el modal
    useEffect(() => {
        if (open) {
            loadProductos();
        } else {
            resetForm();
        }
    }, [open]);

    // Búsqueda de jefes de campaña con debounce (Criterio 2.1.1)
    useEffect(() => {
        if (!open) {
            return;
        }

        // Solo buscar si hay texto ingresado
        if (!searchJefes.trim()) {
            return;
        }

        const timeoutId = setTimeout(() => {
            loadJefesCampana(searchJefes);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchJefes, open]);
    const resetForm = () => {
        setNombre('');
        setDescripcion('');
        setFechaInicio('');
        setFechaFin('');
        setEstadoActivo(true);
        setJefeCampanaSeleccionado(null);
        setProductosSeleccionados([]);
        setSearchJefes('');
        setErrors({});
        setSuccessMessage('');
    };

    /**
     * Criterio 2.1.1: Búsqueda en tiempo real de jefes de campaña
     */
    const loadJefesCampana = async (query) => {
        try {
            setLoadingJefes(true);
            const jefes = await searchJefesCampana(query);
            setJefesCampana(jefes || []);
        } catch (err) {
            console.error('[CreateCampaignModal] Error buscando jefes:', err);
        } finally {
            setLoadingJefes(false);
        }
    };

    /**
     * Criterio 2.1.8: Cargar productos disponibles
     */
    const loadProductos = async () => {
        try {
            setLoadingProductos(true);
            const response = await getProductosActivos();

            if (response.success) {
                setProductos(response.productos || []);
            }
        } catch (err) {
            console.error('[CreateCampaignModal] Error cargando productos:', err);
            setErrors(prev => ({ ...prev, general: 'Error al cargar los productos' }));
        } finally {
            setLoadingProductos(false);
        }
    };

    /**
     * Validaciones según criterios 2.1.x y 2.2
     */
    const validateForm = () => {
        const newErrors = {};

        // Criterio 2.1.2: Nombre (5-50 caracteres, solo alfabéticos)
        if (!nombre.trim()) {
            newErrors.nombre = 'El nombre de la campaña es obligatorio';
        } else if (nombre.trim().length < 5) {
            newErrors.nombre = 'El nombre debe tener al menos 5 caracteres';
        } else if (nombre.trim().length > 50) {
            newErrors.nombre = 'El nombre no puede exceder 50 caracteres';
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre.trim())) {
            newErrors.nombre = 'El nombre solo puede contener caracteres alfabéticos';
        }

        // Criterio 2.1.4: Descripción (máx 200 caracteres, alfabético)
        if (!descripcion.trim()) {
            newErrors.descripcion = 'La descripción es obligatoria';
        } else if (descripcion.trim().length > 200) {
            newErrors.descripcion = 'La descripción no puede exceder 200 caracteres';
        }

        // Criterio 2.1.1: Jefe de campaña obligatorio
        if (!jefeCampanaSeleccionado) {
            newErrors.jefe_campana = 'Debe seleccionar un jefe de campaña';
        }

        // Criterio 2.1.6: Fecha de inicio obligatoria
        if (!fechaInicio) {
            newErrors.fecha_inicio = 'La fecha de inicio es obligatoria';
        }

        // Criterio 2.1.7: Fecha de fin obligatoria
        if (!fechaFin) {
            newErrors.fecha_fin = 'La fecha de fin es obligatoria';
        }

        // Validar que fecha fin > fecha inicio
        if (fechaInicio && fechaFin && new Date(fechaFin) <= new Date(fechaInicio)) {
            newErrors.fecha_fin = 'La fecha de fin debe ser posterior a la fecha de inicio';
        }

        // Criterio 2.1.8: Al menos un producto
        if (productosSeleccionados.length === 0) {
            newErrors.productos = 'Debe seleccionar al menos un producto';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Criterio 3.1: Guardar campaña
     */
    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);
            setErrors({});

            // Mapear estado a ID (1 = ACTIVA, 2 = INACTIVA)
            // Esto debe coincidir con los IDs de TiposParametros en tu backend
            const estadoId = estadoActivo ? 1 : 2;

            const data = {
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                estado: estadoId,
                jefe_campana: jefeCampanaSeleccionado.documento_id,
                productos_ids: productosSeleccionados.map(p => p.id)
            };

            const response = await createCampaign(data);

            if (response.message) {
                // Criterio 3.2: Mensaje "campaña agregada exitosamente"
                setSuccessMessage(response.message);

                // Esperar 1.5 segundos antes de cerrar
                setTimeout(() => {
                    onCampaignCreated();
                }, 1500);
            }
        } catch (err) {
            console.error('[CreateCampaignModal] Error creando campaña:', err);

            // Mostrar errores del backend
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else if (err.response?.data) {
                // Manejar errores de validación de DRF
                const backendErrors = err.response.data;
                const formattedErrors = {};

                Object.keys(backendErrors).forEach(key => {
                    if (Array.isArray(backendErrors[key])) {
                        formattedErrors[key] = backendErrors[key][0];
                    } else {
                        formattedErrors[key] = backendErrors[key];
                    }
                });

                setErrors(formattedErrors);
            } else {
                setErrors({ general: 'Error al crear la campaña' });
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Criterio 3.1: Botón cancelar
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
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    backdropFilter: 'blur(4px)',
                },
            }}
        >
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    background: (theme) =>
                        theme.palette.mode === 'light'
                            ? 'linear-gradient(135deg, #0C155A 0%, #1A2E7A 100%)'
                            : 'linear-gradient(135deg, #1A2E7A 0%, #0F1F4A 100%)',
                    color: 'white',
                    borderRadius: '12px 12px 0 0',
                }}
            >
                Crear Nueva Campaña
            </DialogTitle>

            <DialogContent dividers sx={{ py: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {successMessage && (
                        <Box
                            sx={{
                                p: 2,
                                bgcolor: 'success.light',
                                borderLeft: '4px solid',
                                borderColor: 'success.main',
                                borderRadius: 1,
                            }}
                        >
                            <Typography color="success.main" variant="body2" sx={{ fontWeight: 600 }}>
                                {successMessage}
                            </Typography>
                        </Box>
                    )}

                    {errors.general && (
                        <Box
                            sx={{
                                p: 2,
                                bgcolor: 'error.light',
                                borderLeft: '4px solid',
                                borderColor: 'error.main',
                                borderRadius: 1,
                            }}
                        >
                            <Typography color="error" variant="body2">
                                {errors.general}
                            </Typography>
                        </Box>
                    )}

                    {/* Nombre de la campaña */}
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                color: 'text.secondary',
                                mb: 2,
                                display: 'block',
                            }}
                        >
                            Nombre de la Campaña
                        </Typography>
                        <TextField
                            fullWidth
                            label="Ej: Campaña Navidad 2025"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            error={!!errors.nombre}
                            helperText={errors.nombre || `${nombre.length}/50 caracteres`}
                            disabled={loading || !!successMessage}
                            inputProps={{ maxLength: 50 }}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    backgroundColor: (theme) =>
                                        theme.palette.mode === 'light'
                                            ? '#EBF5FE'
                                            : 'rgba(255, 255, 255, 0.05)',
                                    '& fieldset': {
                                        borderColor: (theme) =>
                                            theme.palette.mode === 'light'
                                                ? 'rgba(12, 21, 90, 0.15)'
                                                : 'rgba(255, 255, 255, 0.15)',
                                        borderWidth: '1.5px',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: (theme) =>
                                            theme.palette.mode === 'light'
                                                ? 'rgba(12, 21, 90, 0.3)'
                                                : 'rgba(255, 255, 255, 0.3)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: (theme) => theme.palette.primary.main,
                                        borderWidth: '2px',
                                    },
                                },
                            }}
                        />
                    </Box>

                    {/* Descripción */}
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                color: 'text.secondary',
                                mb: 2,
                                display: 'block',
                            }}
                        >
                            Descripción
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            label="Describe los objetivos y características de la campaña"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            error={!!errors.descripcion}
                            helperText={errors.descripcion || `${descripcion.length}/200 caracteres`}
                            disabled={loading || !!successMessage}
                            inputProps={{ maxLength: 200 }}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    backgroundColor: (theme) =>
                                        theme.palette.mode === 'light'
                                            ? '#EBF5FE'
                                            : 'rgba(255, 255, 255, 0.05)',
                                    '& fieldset': {
                                        borderColor: (theme) =>
                                            theme.palette.mode === 'light'
                                                ? 'rgba(12, 21, 90, 0.15)'
                                                : 'rgba(255, 255, 255, 0.15)',
                                        borderWidth: '1.5px',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: (theme) =>
                                            theme.palette.mode === 'light'
                                                ? 'rgba(12, 21, 90, 0.3)'
                                                : 'rgba(255, 255, 255, 0.3)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: (theme) => theme.palette.primary.main,
                                        borderWidth: '2px',
                                    },
                                },
                            }}
                        />
                    </Box>

                    {/* Jefe de campaña */}
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                color: 'text.secondary',
                                mb: 2,
                                display: 'block',
                            }}
                        >
                            Jefe de Campaña
                        </Typography>
                        <Autocomplete
                            options={jefesCampana}
                            getOptionLabel={(option) => option.nombre_completo || ''}
                            value={jefeCampanaSeleccionado}
                            onChange={(event, newValue) => {
                                setJefeCampanaSeleccionado(newValue);
                                setErrors(prev => ({ ...prev, jefe_campana: null }));
                            }}
                            inputValue={searchJefes}
                            onInputChange={(event, newInputValue) => {
                                setSearchJefes(newInputValue);
                            }}
                            onOpen={() => {
                                if (jefesCampana.length === 0 && !loadingJefes) {
                                    loadJefesCampana('a');
                                }
                            }}
                            loading={loadingJefes}
                            disabled={loading || !!successMessage}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Buscar por nombre o código"
                                    error={!!errors.jefe_campana}
                                    helperText={errors.jefe_campana}
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            backgroundColor: (theme) =>
                                                theme.palette.mode === 'light'
                                                    ? '#EBF5FE'
                                                    : 'rgba(255, 255, 255, 0.05)',
                                            '& fieldset': {
                                                borderColor: (theme) =>
                                                    theme.palette.mode === 'light'
                                                        ? 'rgba(12, 21, 90, 0.15)'
                                                        : 'rgba(255, 255, 255, 0.15)',
                                                borderWidth: '1.5px',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: (theme) =>
                                                    theme.palette.mode === 'light'
                                                        ? 'rgba(12, 21, 90, 0.3)'
                                                        : 'rgba(255, 255, 255, 0.3)',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: (theme) => theme.palette.primary.main,
                                                borderWidth: '2px',
                                            },
                                        },
                                    }}
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <>
                                                <SearchIcon sx={{ ml: 0, mr: 0.5, color: 'text.secondary', flexShrink: 0 }} />
                                                {params.InputProps.startAdornment}
                                            </>
                                        ),
                                        endAdornment: (
                                            <>
                                                {loadingJefes ? <CircularProgress size={20} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props}>
                                    <Box>
                                        <Typography variant="body2">{option.nombre_completo}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {option.email} • Código: {option.codigo}
                                        </Typography>
                                    </Box>
                                </li>
                            )}
                            noOptionsText={
                                loadingJefes
                                    ? "Cargando..."
                                    : searchJefes
                                        ? "No se encontraron jefes de campaña"
                                        : "No hay jefes disponibles"
                            }
                        />
                    </Box>

                    {/* Fecha de inicio */}
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                color: 'text.secondary',
                                mb: 2,
                                display: 'block',
                            }}
                        >
                            Fecha de Inicio
                        </Typography>
                        <TextField
                            fullWidth
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            error={!!errors.fecha_inicio}
                            helperText={errors.fecha_inicio}
                            disabled={loading || !!successMessage}
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    backgroundColor: (theme) =>
                                        theme.palette.mode === 'light'
                                            ? '#EBF5FE'
                                            : 'rgba(255, 255, 255, 0.05)',
                                    '& fieldset': {
                                        borderColor: (theme) =>
                                            theme.palette.mode === 'light'
                                                ? 'rgba(12, 21, 90, 0.15)'
                                                : 'rgba(255, 255, 255, 0.15)',
                                        borderWidth: '1.5px',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: (theme) =>
                                            theme.palette.mode === 'light'
                                                ? 'rgba(12, 21, 90, 0.3)'
                                                : 'rgba(255, 255, 255, 0.3)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: (theme) => theme.palette.primary.main,
                                        borderWidth: '2px',
                                    },
                                },
                            }}
                        />
                    </Box>

                    {/* Fecha de fin */}
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                color: 'text.secondary',
                                mb: 2,
                                display: 'block',
                            }}
                        >
                            Fecha de Fin
                        </Typography>
                        <TextField
                            fullWidth
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            error={!!errors.fecha_fin}
                            helperText={errors.fecha_fin}
                            disabled={loading || !!successMessage}
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    backgroundColor: (theme) =>
                                        theme.palette.mode === 'light'
                                            ? '#EBF5FE'
                                            : 'rgba(255, 255, 255, 0.05)',
                                    '& fieldset': {
                                        borderColor: (theme) =>
                                            theme.palette.mode === 'light'
                                                ? 'rgba(12, 21, 90, 0.15)'
                                                : 'rgba(255, 255, 255, 0.15)',
                                        borderWidth: '1.5px',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: (theme) =>
                                            theme.palette.mode === 'light'
                                                ? 'rgba(12, 21, 90, 0.3)'
                                                : 'rgba(255, 255, 255, 0.3)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: (theme) => theme.palette.primary.main,
                                        borderWidth: '2px',
                                    },
                                },
                            }}
                        />
                    </Box>

                    {/* Productos a vender */}
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                color: 'text.secondary',
                                mb: 2,
                                display: 'block',
                            }}
                        >
                            Productos a Vender
                        </Typography>
                        <Autocomplete
                            multiple
                            options={productos}
                            getOptionLabel={(option) => option.nombre || ''}
                            value={productosSeleccionados}
                            onChange={(event, newValue) => {
                                setProductosSeleccionados(newValue);
                                setErrors(prev => ({ ...prev, productos: null }));
                            }}
                            loading={loadingProductos}
                            disabled={loading || !!successMessage}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Selecciona uno o varios productos"
                                    error={!!errors.productos}
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            backgroundColor: (theme) =>
                                                theme.palette.mode === 'light'
                                                    ? '#EBF5FE'
                                                    : 'rgba(255, 255, 255, 0.05)',
                                            '& fieldset': {
                                                borderColor: (theme) =>
                                                    theme.palette.mode === 'light'
                                                        ? 'rgba(12, 21, 90, 0.15)'
                                                        : 'rgba(255, 255, 255, 0.15)',
                                                borderWidth: '1.5px',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: (theme) =>
                                                    theme.palette.mode === 'light'
                                                        ? 'rgba(12, 21, 90, 0.3)'
                                                        : 'rgba(255, 255, 255, 0.3)',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: (theme) => theme.palette.primary.main,
                                                borderWidth: '2px',
                                            },
                                        },
                                    }}
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {loadingProductos ? <CircularProgress size={20} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props}>
                                    <Box sx={{ width: '100%' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2">{option.nombre}</Typography>
                                            <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                                                ${parseFloat(option.precio).toLocaleString('es-CO')}
                                            </Typography>
                                        </Box>
                                        {option.descripcion && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {option.descripcion}
                                            </Typography>
                                        )}
                                    </Box>
                                </li>
                            )}
                            noOptionsText="No hay productos disponibles"
                        />
                        {errors.productos && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block', ml: 2 }}>
                                {errors.productos}
                            </Typography>
                        )}
                    </Box>

                    {/* Estado - Switch */}
                    <Box
                        sx={{
                            p: 2,
                            backgroundColor: (theme) =>
                                theme.palette.mode === 'light'
                                    ? 'rgba(12, 21, 90, 0.03)'
                                    : 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '10px',
                            border: '1.5px solid',
                            borderColor: (theme) =>
                                theme.palette.mode === 'light'
                                    ? 'rgba(12, 21, 90, 0.1)'
                                    : 'rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: 'text.primary' }}
                        >
                            Estado de la Campaña
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={estadoActivo}
                                    onChange={(e) => setEstadoActivo(e.target.checked)}
                                    disabled={loading || !!successMessage}
                                    color="primary"
                                />
                            }
                            label={
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        color: estadoActivo
                                            ? 'success.main'
                                            : 'text.secondary',
                                    }}
                                >
                                    {estadoActivo ? 'Activa' : 'Inactiva'}
                                </Typography>
                            }
                            sx={{ m: 0 }}
                        />
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions
                sx={{
                    p: 2,
                    gap: 1,
                    backgroundColor: (theme) =>
                        theme.palette.mode === 'light'
                            ? 'rgba(0, 0, 0, 0.02)'
                            : 'rgba(255, 255, 255, 0.02)',
                }}
            >
                <Button
                    onClick={handleClose}
                    color="inherit"
                    disabled={loading || !!successMessage}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || !!successMessage}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: '8px',
                        background: (theme) =>
                            theme.palette.mode === 'light'
                                ? 'linear-gradient(135deg, #0C155A 0%, #1A2E7A 100%)'
                                : 'linear-gradient(135deg, #1A2E7A 0%, #0F1F4A 100%)',
                        boxShadow: '0 4px 12px rgba(12, 21, 90, 0.25)',
                        '&:hover': {
                            boxShadow: '0 6px 16px rgba(12, 21, 90, 0.35)',
                            transform: 'translateY(-2px)',
                        },
                    }}
                >
                    {loading ? 'Guardando...' : 'Crear Campaña'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateCampaignModal;
