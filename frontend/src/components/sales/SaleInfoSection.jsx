//Path: frontend/src/components/sales/SaleInfoSection.jsx

import * as React from "react";
import { Grid, Box, Typography, TextField, Button } from "@mui/material";

export default function SaleInfoSection({ venta, handleStartSale }) {
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
                    <TextField
                        fullWidth
                        label="Producto"
                        value={venta.producto}
                        InputProps={{ readOnly: true }}
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
                        label="Valor"
                        value={venta.valor}
                        InputProps={{ readOnly: true }}
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
                        onClick={handleStartSale}
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
