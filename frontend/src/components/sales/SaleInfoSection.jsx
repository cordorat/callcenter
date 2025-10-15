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
                variant="h5"
                fontWeight={700}
                color="#0C155A"
                mb={5}
                sx={{

                    letterSpacing: '0.5px',
                }}
            >
                Información de la venta
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
    );
}
