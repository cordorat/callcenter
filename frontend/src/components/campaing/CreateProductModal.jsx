import * as React from "react";
import {
  Box,
  Button,
  Dialog,
  TextField,
  Typography,
  Grid,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
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
    e.preventDefault();
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
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            zIndex: 1,
            backgroundColor:
              theme.palette.mode === "light"
                ? "rgba(0,0,0,0.04)"
                : "rgba(255,255,255,0.08)",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? "rgba(0,0,0,0.08)"
                  : "rgba(255,255,255,0.12)",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ p: 4 }}>
        {successMessage && (
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              backgroundColor: "#e6f4ea",
              border: "1px solid #2e7d32",
              color: "#2e7d32",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {successMessage}
          </Box>
        )}

        <Typography variant="h5" fontWeight="bold" mb={3} textAlign="center">
          Crear Producto
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
            {/* Fila 1: Nombre */}
            <TextField
              label="Nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              error={!!errors.nombre}
              helperText={errors.nombre}
              disabled={loading || !!successMessage}
              variant="outlined"
              sx={{
                width: "500px",
                "& .MuiOutlinedInput-root": {
                  height: "60px",
                },
              }}
            />

            {/* Fila 2: Descripción */}
            <TextField
              label="Descripción"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              error={!!errors.descripcion}
              helperText={errors.descripcion}
              disabled={loading || !!successMessage}
              variant="outlined"
              multiline
              rows={3}
              sx={{
                width: "500px",
              }}
            />

            {/* Fila 3: Precio */}
            <TextField
              label="Precio"
              name="precio"
              type="number"
              value={formData.precio}
              onChange={handleChange}
              error={!!errors.precio}
              helperText={errors.precio}
              disabled={loading || !!successMessage}
              variant="outlined"
              sx={{
                width: "500px",
                "& .MuiOutlinedInput-root": {
                  height: "60px",
                },
              }}
            />
          </Box>

          {/* Botones */}
          <Box sx={{ pt: 2, alignItems: "center", textAlign: "center" }}>
            <Box sx={{ display: "flex", gap: 1.5, mt: 2.5, justifyContent: "center" }}>
              <Grid item xs={12} md={6} textAlign="center">
                <Button
                  type="button"
                  size="large"
                  variant="contained"
                  onClick={onClose}
                  disabled={loading || !!successMessage}
                  sx={{
                    width: "100%",
                    borderRadius: 2,
                    py: 1.5,
                    fontSize: "1rem",
                    fontWeight: "bold",
                    backgroundColor: theme.palette.primary.secondary,
                  }}
                >
                  Cancelar
                </Button>
              </Grid>
              <Grid item xs={12} md={6} textAlign="center">
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || !!successMessage}
                  sx={{
                    width: "100%",
                    borderRadius: 2,
                    py: 1.5,
                    fontSize: "1rem",
                    fontWeight: "bold",
                    backgroundColor: theme.palette.primary.main,
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </Grid>
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
