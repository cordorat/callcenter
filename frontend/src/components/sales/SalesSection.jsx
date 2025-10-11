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
        <Box 
            border="1.5px solid #0C155A" 
            borderRadius={4} 
            p={2} 
            width="100%"
            height="100%"
            display="flex"
            flexDirection="column"
            backgroundColor="#EBF5FE"
        >
        {/* --- Sección Cliente --- */}
        <Typography
            variant="h5"
            align="center"
            fontWeight={600}
            color="#0C155A"
            mb={2}
        >
            Información del Cliente
        </Typography>

        <Grid container spacing={2}>
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
                />
            </Grid>
            ))}
        </Grid>

        </Box>
        <Box 
            border="1.5px solid #0C155A" 
            borderRadius={4} 
            p={2} 
            width="100%"
            height="100%"
            display="flex"
            flexDirection="column"
            backgroundColor="#EBF5FE"
            sx={{ alignItems: "center" }}
        >

            <Typography
                variant="h5"
                align="center"
                fontWeight={600}
                color="#0C155A"
                mb={2}
            >
                Información de la Venta
            </Typography>

            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                <TextField
                    fullWidth
                    label="Producto"
                    value={venta.producto}
                    InputProps={{ readOnly: true }}
                />
                </Grid>
                <Grid item xs={12} md={5}>
                <TextField
                    fullWidth
                    label="Valor"
                    value={venta.valor}
                    InputProps={{ readOnly: true }}
                />
                </Grid>
                <Grid item xs={12} md={2}>
                <Button
                    fullWidth
                    variant="contained"
                    sx={{
                    backgroundColor: "#0C155A",
                    height: "56px",
                    fontWeight: 600,
                    ":hover": { backgroundColor: "#1E2A78" },
                    }}
                    onClick={handleStartSale}
                >
                    Iniciar Venta
                </Button>
                </Grid>
            </Grid>
        </Box>
    </Box>
  );
}
