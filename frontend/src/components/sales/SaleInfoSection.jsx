//Path: frontend/src/components/sales/SaleInfoSection.jsx

import * as React from "react";
import { Grid, Box, Typography, TextField, Button, InputLabel, Select, MenuItem, FormControl } from "@mui/material";
import {getProductosCampana} from "@/core/api/products";
import { createSale } from "@/core/api/sales";
export default function SaleInfoSection({cliente, llamada_id, onVentaChange }) {
    const [productos, setProductos] = React.useState([]);
    const [venta, setVenta] = React.useState({
        producto: "",
        monto: "",
        observaciones: "",
    });

    React.useEffect(() => {
        const fetchProductos = async () => {
            const res = await getProductosCampana(); 
            setProductos(res.data);
        };
        fetchProductos();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const nuevaVenta = { ...venta, [name]: value };
        setVenta(nuevaVenta);
        onVentaChange?.(nuevaVenta); 
    };

    const handleCreateVenta = async () => {
        const data = {
            cliente_id: cliente?.cliente_id,
            llamada_id: llamada_id,
            producto: producto,
            monto: monto,
            observaciones: observaciones,
        };

        const res = await createSale(data);
        console.log("Venta creada:", res);
    };    
    return (
        <Box
            sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: (theme) => theme.palette.background.paper,
                borderRadius: 3,
                p: 3,
                boxShadow: (theme) => theme.palette.mode === 'light'
                    ? '0 2px 8px rgba(12, 21, 90, 0.06)'
                    : '0 2px 8px rgba(0, 0, 0, 0.3)',
                transition: 'box-shadow 0.2s ease',
                '&:hover': {
                    boxShadow: (theme) => theme.palette.mode === 'light'
                        ? '0 4px 12px rgba(12, 21, 90, 0.1)'
                        : '0 4px 12px rgba(0, 0, 0, 0.5)',
                }
            }}
        >
           <Typography
                variant="h5"
                fontWeight={700}
                color="text.primary"
                mb={6}
                sx={{

                    letterSpacing: '0.5px',
                }}
            >
                Información de la Venta
            </Typography>

            <Grid container spacing={2.5} alignItems="center">
                <Grid item xs={12} md={5}>
                <FormControl fullWidth>
                    <InputLabel id="producto-label">Producto</InputLabel>
                    <Select
                    labelId="producto-label"
                    value={productos || ""}
                    label="Producto"
                    onChange={(e) => setVenta({ ...venta, producto: e.target.value })}
                    sx={{
                        backgroundColor: (theme) =>
                        theme.palette.mode === 'light'
                            ? '#EBF5FE'
                            : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '10px',
                        '& fieldset': {
                        borderColor: (theme) =>
                            theme.palette.mode === 'light'
                            ? 'rgba(12, 21, 90, 0.15)'
                            : 'rgba(255, 255, 255, 0.15)',
                        borderWidth: '1.5px',
                        },
                    }}
                    >
                    <MenuItem value="">Seleccionar producto</MenuItem>
                    {productos.map((producto) => (
                        <MenuItem key={producto.id} value={producto.id}>
                        {producto.nombre}
                        </MenuItem>
                    ))}
                    </Select>
                </FormControl>
                </Grid>
                <Grid item xs={12} md={5}>
                    <TextField
                        fullWidth
                        label="Monto"
                        value={monto}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: (theme) => theme.palette.mode === 'light'
                                    ? '#EBF5FE'
                                    : 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '10px',
                                '& fieldset': {
                                    borderColor: (theme) => theme.palette.mode === 'light'
                                        ? 'rgba(12, 21, 90, 0.15)'
                                        : 'rgba(255, 255, 255, 0.15)',
                                    borderWidth: '1.5px',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: 'text.secondary',
                                fontWeight: 500,
                            },
                            '& .MuiInputBase-input': {
                                color: 'text.primary',
                                fontWeight: 500,
                            },
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={5}>
                    <TextField
                        fullWidth
                        label="Observaciones"
                        multiline
                        rows={3}
                        value={observaciones}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: (theme) => theme.palette.mode === 'light'
                                    ? '#EBF5FE'
                                    : 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '10px',
                                '& fieldset': {
                                    borderColor: (theme) => theme.palette.mode === 'light'
                                        ? 'rgba(12, 21, 90, 0.15)'
                                        : 'rgba(255, 255, 255, 0.15)',
                                    borderWidth: '1.5px',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: 'text.secondary',
                                fontWeight: 500,
                            },
                            '& .MuiInputBase-input': {
                                color: 'text.primary',
                                fontWeight: 500,
                            },
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={2}>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleCreateVenta}
                        sx={{
                            backgroundColor: (theme) => theme.palette.primary.main,
                            color: 'white',
                            height: "56px",
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            borderRadius: '10px',
                            textTransform: 'none',
                            boxShadow: (theme) => theme.palette.mode === 'light'
                                ? '0 2px 8px rgba(12, 21, 90, 0.25)'
                                : '0 2px 8px rgba(0, 0, 0, 0.5)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                backgroundColor: (theme) => theme.palette.mode === 'light'
                                    ? '#1a2b7a'
                                    : theme.palette.primary.dark,
                                boxShadow: (theme) => theme.palette.mode === 'light'
                                    ? '0 4px 12px rgba(12, 21, 90, 0.35)'
                                    : '0 4px 12px rgba(0, 0, 0, 0.7)',
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
    );
}
