// Path: frontend/src/components/sales/SaleInfoSection.jsx

import * as React from "react";
import {
  Grid,
  Box,
  Typography,
  TextField,
  Button,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { getProducts } from "@/core/api/products";
import { createSale } from "@/core/api/sales";

export default function SaleInfoSection({ cliente, llamada_id, campana_id, onVentaChange }) {
  const [productos, setProductos] = React.useState([]);
  const [loadingProductos, setLoadingProductos] = React.useState(false);
  const [localLlamadaId, setLocalLlamadaId] = React.useState(llamada_id);
  const [venta, setVenta] = React.useState({
    producto: "",
    monto: "",
    observaciones: "",
  });

  React.useEffect(() => {
    if (llamada_id !== localLlamadaId) {
      setLocalLlamadaId(llamada_id);
    }
  }, [llamada_id]);

  React.useEffect(() => {
    if (!campana_id) {
      setProductos([]);
      return;
    }

    const fetchProductos = async () => {
      setLoadingProductos(true);
      try {
        const res = await getProducts({ campaña: campana_id });
        setProductos(res.productos || []);
      } catch (error) {
        setProductos([]);
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchProductos();
  }, [campana_id]);

  // Manejo de cambios de inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    const nuevaVenta = { ...venta, [name]: value };
    setVenta(nuevaVenta);
    onVentaChange?.(nuevaVenta);
  };


  const handleCreateVenta = async (datosVenta) => {

    // Validaciones básicas
    if (!localLlamadaId) {
      alert("❌ No hay llamada activa para registrar venta");
      return;
    }

    if (!cliente?.nombre || !cliente?.id) {
      alert("❌ Faltan datos del cliente (nombre o id)");
      console.error("[SaleInfo] Cliente incompleto:", cliente);
      return;
    }

    if (!datosVenta?.producto?.id) {
      alert("❌ Debes seleccionar un producto válido");
      console.error("[SaleInfo] Producto inválido:", datosVenta?.producto);
      return;
    }

    try {
      const payload = {
        llamada_id: localLlamadaId,
        cliente_nombre: cliente.nombre,
        cliente_id: cliente.id,
        producto_id: datosVenta.producto.id,
        monto: datosVenta.monto || null,
        observaciones: datosVenta.observaciones || "",
      };


      const result = await createSale(payload);
      
      alert("✅ Venta registrada exitosamente");

      const nuevaVenta = { producto: "", monto: "", observaciones: "" };
      setVenta(nuevaVenta);
      onVentaChange?.(nuevaVenta);
      
    } catch (error) {
      
      // Mostrar mensaje de error específico del backend si existe
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.message 
        || error.message 
        || "Error de conexión. Verifica tu red e intenta nuevamente.";
      
      alert(`❌ ${errorMessage}`);
    }
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
        boxShadow: (theme) =>
          theme.palette.mode === "light"
            ? "0 2px 8px rgba(12, 21, 90, 0.06)"
            : "0 2px 8px rgba(0, 0, 0, 0.3)",
        transition: "box-shadow 0.2s ease",
        "&:hover": {
          boxShadow: (theme) =>
            theme.palette.mode === "light"
              ? "0 4px 12px rgba(12, 21, 90, 0.1)"
              : "0 4px 12px rgba(0, 0, 0, 0.5)",
        },
      }}
    >
      <Typography variant="h5" fontWeight={700} color="text.primary" mb={6}>
        Información de la Venta
      </Typography>

      <Grid container spacing={2.5} alignItems="center">
        {/* ✅ SELECT corregido para manejar producto como objeto */}
        <Grid item xs={12} md={5}>
          <FormControl fullWidth sx={{ fontSize: "1.2rem", minWidth: "250px" }}>
            <InputLabel id="producto-label">Producto</InputLabel>
            <Select
              labelId="producto-label"
              value={venta.producto?.id || ""}
              label="Seleccione un producto"
              name="producto"
              onChange={(e) => {
                const productoSeleccionado = productos.find(
                  (p) => p.id === e.target.value
                );
                handleChange({
                  target: { name: "producto", value: productoSeleccionado },
                });
              }}
              sx={{
                backgroundColor: (theme) =>
                  theme.palette.mode === "light"
                    ? "#EBF5FE"
                    : "rgba(255, 255, 255, 0.05)",
                borderRadius: "10px",
                "& fieldset": {
                  borderColor: (theme) =>
                    theme.palette.mode === "light"
                      ? "rgba(12, 21, 90, 0.15)"
                      : "rgba(255, 255, 255, 0.15)",
                  borderWidth: "1.5px",
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
            name="monto"
            value={venta.monto}
            onChange={handleChange}
          />
        </Grid>

        <Grid item xs={12} md={5}>
          <TextField
            fullWidth
            label="Observaciones"
            name="observaciones"
            multiline
            rows={3}
            value={venta.observaciones}
            onChange={handleChange}
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => handleCreateVenta(venta)}
            sx={{
              height: "56px",
              fontWeight: 600,
              borderRadius: "10px",
              textTransform: "none",
            }}
          >
            Iniciar Venta
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
