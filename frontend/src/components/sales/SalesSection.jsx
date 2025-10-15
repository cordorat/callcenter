//Path: frontend/src/components/sales/SalesSection.jsx

import * as React from "react";
import { Grid, Box, Typography, TextField, Button, Divider, Stack, CircularProgress, Alert, Snackbar, IconButton } from "@mui/material";
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, PersonSearch as PersonSearchIcon, Close as CloseIcon } from "@mui/icons-material";
import { getRandomCliente, updateCliente, validateClienteField } from "../../core/api/clientes";

export default function SalesSection() {
    // Estado del cliente
    const [cliente, setCliente] = React.useState({
        cliente_id: null,
        nombre: "",
        documento_id: "",
        telefono: "",
        direccion: "",
        email: "",
        observaciones: "",
    });

    // Backup del cliente para cancelar edición
    const [clienteBackup, setClienteBackup] = React.useState(null);

    // Estado de la venta
    const [venta, setVenta] = React.useState({
        producto: "",
        valor: "",
    });

    // Estados de UI
    const [isEditing, setIsEditing] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [errors, setErrors] = React.useState({});
    
    // Notificaciones
    const [notification, setNotification] = React.useState({
        open: false,
        message: "",
        severity: "success" // "success" | "error" | "warning" | "info"
    });

    const hasCliente = Boolean(cliente.cliente_id);

    // Obtener cliente aleatorio
    const handleGetRandomCliente = async () => {
        setIsLoading(true);
        setErrors({});
        
        try {
            const response = await getRandomCliente();
            
            if (response.success && response.cliente) {
                const clienteData = {
                    cliente_id: response.cliente.cliente_id,
                    nombre: response.cliente.nombre || "",
                    documento_id: response.cliente.documento_id || "",
                    telefono: response.cliente.telefono || "",
                    direccion: response.cliente.direccion || "",
                    email: response.cliente.email || "",
                    observaciones: response.cliente.observaciones || "",
                };
                
                setCliente(clienteData);
                setNotification({
                    open: true,
                    message: response.message || "Cliente cargado exitosamente",
                    severity: "success"
                });
            } else {
                setNotification({
                    open: true,
                    message: response.message || "No se pudo obtener el cliente",
                    severity: "warning"
                });
            }
        } catch (error) {
            console.error("Error obteniendo cliente aleatorio:", error);
            setNotification({
                open: true,
                message: error.response?.data?.message || "Error al obtener el cliente. Intente nuevamente.",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Iniciar edición
    const handleStartEdit = () => {
        setClienteBackup({ ...cliente }); // Guardar backup para cancelar
        setIsEditing(true);
        setErrors({});
    };

    // Cancelar edición
    const handleCancelEdit = () => {
        if (clienteBackup) {
            setCliente(clienteBackup); // Restaurar datos originales
        }
        setIsEditing(false);
        setErrors({});
        setClienteBackup(null);
    };

    // Manejar cambios en los campos
    const handleChange = (e) => {
        const { name, value } = e.target;
        
        setCliente({
            ...cliente,
            [name]: value,
        });

        // Validación en tiempo real
        if (isEditing) {
            const error = validateClienteField(name, value);
            setErrors(prev => ({
                ...prev,
                [name]: error
            }));
        }
    };

    // Guardar edición
    const handleSaveEdit = async () => {
        // Validar todos los campos antes de guardar
        const validationErrors = {};
        
        ['nombre', 'telefono', 'email'].forEach(field => {
            const error = validateClienteField(field, cliente[field]);
            if (error) {
                validationErrors[field] = error;
            }
        });

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setNotification({
                open: true,
                message: "Por favor corrija los errores antes de guardar",
                severity: "warning"
            });
            return;
        }

        setIsSaving(true);
        
        try {
            const dataToUpdate = {
                nombre: cliente.nombre,
                telefono: cliente.telefono,
                email: cliente.email || "",
                direccion: cliente.direccion || "",
                observaciones: cliente.observaciones || "",
            };

            const response = await updateCliente(cliente.cliente_id, dataToUpdate);
            
            if (response.success) {
                // Actualizar con los datos del servidor
                if (response.cliente) {
                    setCliente({
                        cliente_id: response.cliente.cliente_id,
                        nombre: response.cliente.nombre || "",
                        documento_id: response.cliente.documento_id || "",
                        telefono: response.cliente.telefono || "",
                        direccion: response.cliente.direccion || "",
                        email: response.cliente.email || "",
                        observaciones: response.cliente.observaciones || "",
                    });
                }
                
                setNotification({
                    open: true,
                    message: response.message || "Los datos del cliente han sido actualizados exitosamente",
                    severity: "success"
                });
                
                setIsEditing(false);
                setErrors({});
                setClienteBackup(null);
            }
        } catch (error) {
            console.error("Error guardando cliente:", error);
            
            // Manejar errores de validación del backend
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                setNotification({
                    open: true,
                    message: "Error de validación en los datos proporcionados",
                    severity: "error"
                });
            } else {
                setNotification({
                    open: true,
                    message: error.response?.data?.message || "Error al actualizar el cliente. Intente nuevamente.",
                    severity: "error"
                });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleStartSale = () => {
        console.log("Iniciando venta con datos:", cliente, venta);
    };

    // Cerrar notificación
    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    return (
        <Box sx={{
            flex: '1',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            alignItems: 'center',
        }}>
            {/* Notificaciones */}
            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert 
                    onClose={handleCloseNotification} 
                    severity={notification.severity}
                    sx={{ width: '100%' }}
                    action={
                        <IconButton
                            size="small"
                            aria-label="close"
                            color="inherit"
                            onClick={handleCloseNotification}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    }
                >
                    {notification.message}
                </Alert>
            </Snackbar>

            {/* Sección Cliente */}
            <Box
                sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "#F8FAFB",
                    borderRadius: 3,
                    p: 3,
                    boxShadow: '0 2px 8px rgba(12, 21, 90, 0.08)',
                    transition: 'box-shadow 0.2s ease',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(12, 21, 90, 0.12)',
                    }
                }}
            >
                {/* Header con título y botones de acción */}
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 3 
                }}>
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        color="#0C155A"
                        sx={{
                            fontSize: '1.1rem',
                            letterSpacing: '0.5px',
                        }}
                    >
                        Información del Cliente
                    </Typography>

                    <Stack direction="row" spacing={1.5}>
                        {/* Botón Obtener Cliente Aleatorio - Solo visible si no hay cliente o no está editando */}
                        {!hasCliente && !isEditing && (
                            <Button
                                variant="outlined"
                                startIcon={isLoading ? <CircularProgress size={20} /> : <PersonSearchIcon />}
                                onClick={handleGetRandomCliente}
                                disabled={isLoading}
                                sx={{
                                    borderColor: '#0C155A',
                                    color: '#0C155A',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    borderRadius: '8px',
                                    px: 2.5,
                                    '&:hover': {
                                        borderColor: '#1a2b7a',
                                        backgroundColor: 'rgba(12, 21, 90, 0.04)',
                                    },
                                }}
                            >
                                {isLoading ? 'Cargando...' : 'Obtener Cliente'}
                            </Button>
                        )}

                        {/* Botón Editar - Solo visible si hay cliente y no está editando */}
                        {hasCliente && !isEditing && (
                            <Button
                                variant="contained"
                                startIcon={<EditIcon />}
                                onClick={handleStartEdit}
                                sx={{
                                    backgroundColor: '#0C155A',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    borderRadius: '8px',
                                    px: 2.5,
                                    boxShadow: '0 2px 6px rgba(12, 21, 90, 0.2)',
                                    '&:hover': {
                                        backgroundColor: '#1a2b7a',
                                        boxShadow: '0 3px 8px rgba(12, 21, 90, 0.3)',
                                    },
                                }}
                            >
                                Editar Información
                            </Button>
                        )}

                        {/* Botones Guardar y Cancelar - Solo visibles al editar */}
                        {isEditing && (
                            <>
                                <Button
                                    variant="outlined"
                                    startIcon={<CancelIcon />}
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    sx={{
                                        borderColor: '#d32f2f',
                                        color: '#d32f2f',
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        px: 2.5,
                                        '&:hover': {
                                            borderColor: '#c62828',
                                            backgroundColor: 'rgba(211, 47, 47, 0.04)',
                                        },
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                    sx={{
                                        backgroundColor: '#2e7d32',
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        px: 2.5,
                                        boxShadow: '0 2px 6px rgba(46, 125, 50, 0.2)',
                                        '&:hover': {
                                            backgroundColor: '#1b5e20',
                                            boxShadow: '0 3px 8px rgba(46, 125, 50, 0.3)',
                                        },
                                    }}
                                >
                                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </>
                        )}
                    </Stack>
                </Box>

                {/* Campos del cliente */}
                <Grid container spacing={2.5}>
                    {[
                        { label: "Nombre Completo", name: "nombre", required: true },
                        { label: "Documento de Identidad", name: "documento_id", readOnly: true },
                        { label: "Teléfono", name: "telefono", required: true },
                        { label: "Dirección", name: "direccion" },
                        { label: "Correo Electrónico", name: "email" },
                        { label: "Observaciones", name: "observaciones", multiline: true },
                    ].map((field) => (
                        <Grid item xs={12} sm={6} md={field.name === 'observaciones' ? 12 : 4} key={field.name}>
                            <TextField
                                fullWidth
                                label={field.label}
                                name={field.name}
                                value={cliente[field.name]}
                                onChange={handleChange}
                                multiline={field.multiline}
                                rows={field.multiline ? 2 : 1}
                                required={field.required}
                                error={Boolean(errors[field.name])}
                                helperText={errors[field.name]}
                                InputProps={{ 
                                    readOnly: field.readOnly || (!isEditing && hasCliente),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: field.readOnly ? '#f5f5f5' : '#EBF5FE',
                                        borderRadius: '10px',
                                        transition: 'all 0.2s ease',
                                        '& fieldset': {
                                            borderColor: errors[field.name] 
                                                ? '#d32f2f' 
                                                : 'rgba(12, 21, 90, 0.15)',
                                            borderWidth: '1.5px',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: errors[field.name] 
                                                ? '#c62828' 
                                                : 'rgba(12, 21, 90, 0.3)',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: errors[field.name] ? '#d32f2f' : '#0C155A',
                                            borderWidth: '2px',
                                        },
                                        '&.Mui-focused': {
                                            backgroundColor: field.readOnly ? '#f5f5f5' : '#EBF5FE',
                                        },
                                        ...(field.readOnly && {
                                            cursor: 'not-allowed',
                                            '& .MuiInputBase-input': {
                                                cursor: 'not-allowed',
                                            }
                                        })
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: errors[field.name] 
                                            ? '#d32f2f' 
                                            : 'rgba(12, 21, 90, 0.7)',
                                        fontWeight: 500,
                                        '&.Mui-focused': {
                                            color: errors[field.name] ? '#d32f2f' : '#0C155A',
                                            fontWeight: 600,
                                        },
                                    },
                                    '& .MuiInputBase-input': {
                                        color: '#0C155A',
                                        fontWeight: 500,
                                    },
                                    '& .MuiFormHelperText-root': {
                                        fontWeight: 500,
                                    }
                                }}
                            />
                        </Grid>
                    ))}
                </Grid>

            </Box>

            {/* Sección Venta */}
            <Box
                sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "#F8FAFB",
                    borderRadius: 3,
                    p: 3,
                    boxShadow: '0 2px 8px rgba(12, 21, 90, 0.06)',
                    transition: 'box-shadow 0.2s ease',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(12, 21, 90, 0.1)',
                    }
                }}
            >
                <Typography
                    variant="h6"
                    fontWeight={700}
                    color="#0C155A"
                    mb={3}
                    sx={{
                        fontSize: '1.1rem',
                        letterSpacing: '0.5px',
                    }}
                >
                    Información de la Venta
                </Typography>

                <Grid container spacing={2.5} alignItems="center">
                    <Grid item xs={12} md={5}>
                        <TextField
                            fullWidth
                            label="Producto"
                            value={venta.producto}
                            InputProps={{ readOnly: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: '#EBF5FE',
                                    borderRadius: '10px',
                                    '& fieldset': {
                                        borderColor: 'rgba(12, 21, 90, 0.15)',
                                        borderWidth: '1.5px',
                                    },
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'rgba(12, 21, 90, 0.7)',
                                    fontWeight: 500,
                                },
                                '& .MuiInputBase-input': {
                                    color: '#0C155A',
                                    fontWeight: 500,
                                },
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <TextField
                            fullWidth
                            label="Valor"
                            value={venta.valor}
                            InputProps={{ readOnly: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: '#EBF5FE',
                                    borderRadius: '10px',
                                    '& fieldset': {
                                        borderColor: 'rgba(12, 21, 90, 0.15)',
                                        borderWidth: '1.5px',
                                    },
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'rgba(12, 21, 90, 0.7)',
                                    fontWeight: 500,
                                },
                                '& .MuiInputBase-input': {
                                    color: '#0C155A',
                                    fontWeight: 500,
                                },
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleStartSale}
                            sx={{
                                backgroundColor: "#0C155A",
                                color: 'white',
                                height: "56px",
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                borderRadius: '10px',
                                textTransform: 'none',
                                boxShadow: '0 2px 8px rgba(12, 21, 90, 0.25)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: "#1a2b7a",
                                    boxShadow: '0 4px 12px rgba(12, 21, 90, 0.35)',
                                    transform: 'translateY(-2px)',
                                },
                                '&:active': {
                                    transform: 'translateY(0)',
                                },
                            }}
                        >
                            Iniciar Venta
                        </Button>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}
