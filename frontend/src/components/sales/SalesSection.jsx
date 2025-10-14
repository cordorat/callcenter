//Path: frontend/src/components/sales/SalesSection.jsx

import * as React from "react";
import { Grid, Box, Typography, TextField, Button, Divider, Stack } from "@mui/material";

export default function SalesSection() {
    const [cliente, setCliente] = React.useState({
        nombre: "",
        documento: "",
        telefono: "",
        direccion: "",
        correo: "",
        ciudad: "",
    });

    const [venta, setVenta] = React.useState({
        producto: "",
        valor: "",
    });

    const handleChange = (e) => {
        setCliente({
            ...cliente,
            [e.target.name]: e.target.value,
        });
    };

    const handleStartSale = () => {
        console.log("Iniciando venta con datos:", cliente, venta);
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
                    Información del Cliente
                </Typography>

                <Grid container spacing={2.5}>
                    {[
                        { label: "Nombre", name: "nombre" },
                        { label: "Documento", name: "documento" },
                        { label: "Teléfono", name: "telefono" },
                        { label: "Dirección", name: "direccion" },
                        { label: "Correo", name: "correo" },
                        { label: "Ciudad", name: "ciudad" },
                    ].map((field) => (
                        <Grid item xs={12} sm={6} md={4} key={field.name}>
                            <TextField
                                fullWidth
                                label={field.label}
                                name={field.name}
                                value={cliente[field.name]}
                                onChange={handleChange}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: '#EBF5FE',
                                        borderRadius: '10px',
                                        transition: 'all 0.2s ease',
                                        '& fieldset': {
                                            borderColor: 'rgba(12, 21, 90, 0.15)',
                                            borderWidth: '1.5px',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: 'rgba(12, 21, 90, 0.3)',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: '#0C155A',
                                            borderWidth: '2px',
                                        },
                                        '&.Mui-focused': {
                                            backgroundColor: '#EBF5FE',
                                        },
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: 'rgba(12, 21, 90, 0.7)',
                                        fontWeight: 500,
                                        '&.Mui-focused': {
                                            color: '#0C155A',
                                            fontWeight: 600,
                                        },
                                    },
                                    '& .MuiInputBase-input': {
                                        color: '#0C155A',
                                        fontWeight: 500,
                                    },
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
