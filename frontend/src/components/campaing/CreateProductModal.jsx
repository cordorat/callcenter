import * as React from "react";
import { Box, Button, Modal, TextField, Typography } from "@mui/material";
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
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "background.paper",
          boxShadow: 24,
          borderRadius: 2,
          p: 4,
          width: 400,
        }}
      >
        {successMessage && (
          <Box
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 1,
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

        <Typography variant="h6" mb={2}>
          Crear Producto
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            margin="normal"
            error={!!errors.nombre}
            helperText={errors.nombre}
          />
          <TextField
            fullWidth
            label="Descripción"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            margin="normal"
            error={!!errors.descripcion}
            helperText={errors.descripcion}
          />
          <TextField
            fullWidth
            label="Precio"
            name="precio"
            type="number"
            value={formData.precio}
            onChange={handleChange}
            margin="normal"
            error={!!errors.precio}
            helperText={errors.precio}
          />

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={onClose} sx={{ mr: 1, backgroundColor: theme.palette.primary.secondary }} variant="contained" >
              Cancelar
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              color="primary"
            >
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}
