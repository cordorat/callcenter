// Path: frontend/src/components/campaing/CreateCampaignModal.jsx

import { useState, useEffect } from 'react';
import {
    Dialog,
    Button,
    TextField,
    Box,
    Typography,
    Autocomplete,
    Chip,
    Alert,
    CircularProgress,
    FormHelperText,
    Grid,
    IconButton,
    Switch,
    FormControlLabel,
    MenuItem
} from '@mui/material';
import {
    Search as SearchIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
    createCampaign,
    searchJefesCampana,
    getProductosActivos
} from '@/core/api/campaigns';

/**
 * Modal para crear nueva campaña
 * Cumple con todos los criterios de la HU:
 * - 2.1.1: Búsqueda de jefe de campaña en tiempo real
 * - 2.1.2: Nombre de campaña (5-50 caracteres, solo alfabéticos)
 * - 2.1.3: Código único automático (backend)
 * - 2.1.4: Descripción (máx 200 caracteres)
 * - 2.1.5: Estado inicial (switch Activa/Inactiva)
 * - 2.1.6-7: Fechas de inicio y fin
 * - 2.1.8: Selección de productos
 * - 2.2: Validaciones de campos obligatorios
 * - 3.1-3.2: Botones guardar y cancelar
 */
const CreateCampaignModal = ({ open, onClose, onCampaignCreated }) => {
    const theme = useTheme();

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

    /**
     * Resetea el formulario
     */
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
            maxWidth={false}
            sx={{
                '& .MuiDialog-paper': {
                    borderRadius: 3,
                    width: 'auto',
                    maxWidth: '90vw',
                    minWidth: '600px',
                }
            }}
        >
            <Box sx={{ position: 'relative' }}>
                <IconButton
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        zIndex: 1,
                        backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)',
                        '&:hover': {
                            backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
                        }
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>

            <Box sx={{ p: 4 }}>
                {/* Criterio 3.2: Mensaje de éxito */}
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

                {/* Error general */}
                {errors.general && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {errors.general}
                    </Alert>
                )}

                <Typography variant="h5" fontWeight="bold" mb={4} textAlign="center">
                    Crear Nueva Campaña
                </Typography>

                <Box component="form" sx={{ maxWidth: '900px', mx: 'auto' }}>
                    <Grid container spacing={3}>
                        {/* Criterio 2.1.2: Nombre de la campaña */}
                        <Grid item xs={12} sx={{ mb: 1 }}>
                            <TextField
                                fullWidth
                                label="Nombre de la Campaña"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                error={!!errors.nombre}
                                helperText={errors.nombre || `${nombre.length}/50 caracteres`}
                                placeholder="Ej: Campaña Navidad 2025"
                                disabled={loading || !!successMessage}
                                required
                                inputProps={{ maxLength: 50 }}
                            />
                        </Grid>

                        {/* Criterio 2.1.4: Descripción */}
                        <Grid item xs={12} sx={{ mb: 1 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Descripción"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                error={!!errors.descripcion}
                                helperText={errors.descripcion || `${descripcion.length}/200 caracteres`}
                                placeholder="Describe los objetivos y características de la campaña"
                                disabled={loading || !!successMessage}
                                required
                                inputProps={{ maxLength: 200 }}
                            />
                        </Grid>

                        {/* Criterio 2.1.1: Elegir jefe de campaña */}
                        <Grid item xs={12} sx={{ mb: 1.5 }}>
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
                                    // Cargar jefes al abrir si aún no hay datos
                                    if (jefesCampana.length === 0 && !loadingJefes) {
                                        loadJefesCampana('a'); // Buscar con 'a' para obtener todos los que contengan 'a'
                                    }
                                }}
                                loading={loadingJefes}
                                disabled={loading || !!successMessage}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Jefe de Campaña"
                                        placeholder="Buscar por nombre o código..."
                                        error={!!errors.jefe_campana}
                                        helperText={errors.jefe_campana}
                                        required
                                        sx={{
                                            '& .MuiInputBase-root': {
                                                paddingRight: '65px !important',
                                                paddingLeft: '14px !important',
                                            },
                                            '& .MuiInputBase-input': {
                                                paddingLeft: '8px !important',
                                                width: '230px !important',
                                                flex: '1 1 auto !important',
                                            },
                                            '& .MuiInputLabel-root': {               
                                                paddingX: 0.5,
                                            }
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
                        </Grid>

                        {/* Criterio 2.1.8: Productos a vender */}
                        <Grid item xs={12} sx={{ mb: 1.5 }}>
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
                                        label="Productos a Vender"
                                        placeholder="Selecciona productos..."
                                        error={!!errors.productos}
                                        required
                                        sx={{
                                            '& .MuiInputBase-root': {
                                                paddingRight: '65px !important',
                                            },
                                            '& .MuiInputBase-input': {
                                                width: '180px !important',
                                                flex: '1 1 auto !important',
                                            },
                                            '& .MuiInputLabel-root': {
                                                paddingX: 0.5,
                                            }
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
                                                <Typography variant="body2" color="primary" fontWeight="bold">
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
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            label={`${option.nombre} ($${parseFloat(option.precio).toLocaleString('es-CO')})`}
                                            {...getTagProps({ index })}
                                            size="small"
                                            deleteIcon={<CloseIcon />}
                                        />
                                    ))
                                }
                                noOptionsText="No hay productos disponibles"
                            />
                            {errors.productos && (
                                <FormHelperText error sx={{ mt: 0.5, ml: 2 }}>
                                    {errors.productos}
                                </FormHelperText>
                            )}
                            {productosSeleccionados.length > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', ml: 2 }}>
                                    {productosSeleccionados.length} {productosSeleccionados.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                                </Typography>
                            )}
                        </Grid>

                        {/* Criterio 2.1.6: Fecha de inicio */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Fecha de Inicio"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                error={!!errors.fecha_inicio}
                                helperText={errors.fecha_inicio}
                                disabled={loading || !!successMessage}
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {/* Criterio 2.1.7: Fecha de fin */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Fecha de Fin"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                error={!!errors.fecha_fin}
                                helperText={errors.fecha_fin}
                                disabled={loading || !!successMessage}
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {/* Criterio 2.1.5: Estado inicial (switch) */}
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={estadoActivo}
                                        onChange={(e) => setEstadoActivo(e.target.checked)}
                                        disabled={loading || !!successMessage}
                                        color="success"
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body1">
                                            Estado:
                                        </Typography>
                                        <Chip
                                            label={estadoActivo ? 'Activa' : 'Inactiva'}
                                            color={estadoActivo ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </Box>
                                }
                            />
                        </Grid>
                    </Grid>

                    {/* Criterio 3: Botones Guardar y Cancelar */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'center' }}>
                        <Button
                            variant="outlined"
                            onClick={handleClose}
                            disabled={loading || !!successMessage}
                            sx={{
                                minWidth: 150,
                                borderRadius: 2,
                                py: 1.5,
                                fontSize: '1rem',
                                fontWeight: 'bold',
                            }}
                        >
                            Cancelar
                        </Button>

                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={loading || !!successMessage}
                            sx={{
                                minWidth: 150,
                                borderRadius: 2,
                                py: 1.5,
                                fontSize: '1rem',
                                fontWeight: 'bold',
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Guardar'}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Dialog>
    );
};

export default CreateCampaignModal;
