import * as React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import { createProduct } from "@/core/api/products";

export default function CreateProductModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
  });

  const theme = useTheme();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre) {
      newErrors.nombre = "El nombre es requerido";
    }

    if (!formData.descripcion) {
      newErrors.descripcion = "La descripcion es requerido";
    }
    if (!formData.precio) {
      newErrors.precio = "El precio es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});

    try {
      await createProduct(formData);
      setSuccessMessage("Producto creado correctamente");
      setFormData({ nombre: "", descripcion: "", precio: "" });
      setTimeout(() => {
        onClose();
        setSuccessMessage("");
      }, 1500);
    } catch (error) {
      console.error("Error al crear producto:", error);
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        elevation: 2,
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>Crear Producto</DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {successMessage && (
            <Box
              sx={{
                p: 2,
                bgcolor: "success.light",
                borderLeft: "4px solid",
                borderColor: "success.main",
                borderRadius: 1,
              }}
            >
              <Typography
                color="success.main"
                variant="body2"
                sx={{ fontWeight: 600 }}
              >
                {successMessage}
              </Typography>
            </Box>
          )}

          {/* SECCIÓN: Información del producto */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "text.secondary",
              }}
            >
              Información del Producto
            </Typography>
            <Divider />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              {/* Nombre */}
              <TextField
                label="Nombre del producto"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                error={!!errors.nombre}
                helperText={errors.nombre}
                disabled={loading || !!successMessage}
                fullWidth
              />

              {/* Descripción */}
              <TextField
                label="Descripción"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                error={!!errors.descripcion}
                helperText={errors.descripcion}
                disabled={loading || !!successMessage}
                fullWidth
                multiline
                minRows={2}
              />

              {/* Precio */}
              <TextField
                label="Precio"
                name="precio"
                type="number"
                value={formData.precio}
                onChange={handleChange}
                error={!!errors.precio}
                helperText={errors.precio}
                disabled={loading || !!successMessage}
                fullWidth
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button 
          onClick={onClose} 
          disabled={loading || !!successMessage}
          sx={{
            backgroundColor: (theme) => theme.palette.primary.secondary,
            color: 'white',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: (theme) => theme.palette.primary.secondary,
              opacity: 0.9
            }
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !!successMessage}
          sx={{ textTransform: 'none' }}
        >
          {loading ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
