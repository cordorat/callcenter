//Path: frontend/src/components/sales/ClientInfoSection.jsx

import * as React from "react";
import { Grid, Box, Typography, TextField } from "@mui/material";

export default function ClientInfoSection({ cliente, handleChange }) {
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
                    ? '0 2px 8px rgba(12, 21, 90, 0.08)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.3)',
                transition: 'box-shadow 0.2s ease',
                '&:hover': {
                    boxShadow: (theme) => theme.palette.mode === 'light'
                        ? '0 4px 12px rgba(12, 21, 90, 0.12)'
                        : '0 4px 12px rgba(0, 0, 0, 0.5)',
                }
            }}
        >
            <Typography
                variant="h5"
                fontWeight={700}
                color="text.primary"
                mb={5}
                sx={{
                    letterSpacing: '0.5px',
                }}
            >
                Información del cliente
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
                                    backgroundColor: (theme) => theme.palette.mode === 'light' 
                                        ? '#EBF5FE' 
                                        : 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '10px',
                                    transition: 'all 0.2s ease',
                                    '& fieldset': {
                                        borderColor: (theme) => theme.palette.mode === 'light'
                                            ? 'rgba(12, 21, 90, 0.15)'
                                            : 'rgba(255, 255, 255, 0.15)',
                                        borderWidth: '1.5px',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: (theme) => theme.palette.mode === 'light'
                                            ? 'rgba(12, 21, 90, 0.3)'
                                            : 'rgba(255, 255, 255, 0.3)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: (theme) => theme.palette.primary.main,
                                        borderWidth: '2px',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: (theme) => theme.palette.mode === 'light'
                                            ? '#EBF5FE'
                                            : 'rgba(255, 255, 255, 0.08)',
                                    },
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'text.secondary',
                                    fontWeight: 500,
                                    '&.Mui-focused': {
                                        color: (theme) => theme.palette.primary.main,
                                        fontWeight: 600,
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    color: 'text.primary',
                                    fontWeight: 500,
                                },
                            }}
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
