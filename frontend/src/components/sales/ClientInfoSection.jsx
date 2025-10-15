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
                variant="h5"
                fontWeight={700}
                color="#0C155A"
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
    );
}
