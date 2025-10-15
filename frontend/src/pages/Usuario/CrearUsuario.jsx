
import { useState } from 'react';
import MainLayout from '@/core/components/layout/MainLayout';
import { Box, TextField, FormControl, FormControlLabel, InputLabel, Select, MenuItem, Button, Checkbox } from '@mui/material';


export default function CrearUsuario() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    rol: "",
    activo: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Datos del formulario:", formData);
  };

  return (
    <MainLayout title="Crear Usuario">
      <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "400px",
        mx: "auto",
        mt: 4,
      }}
    >
        <TextField
          label="Nombre completo"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          variant="outlined"
          required
        />

        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          variant="outlined"
          required
        />

        <FormControl fullWidth>
          <InputLabel>Rol</InputLabel>
          <Select
            name="rol"
            value={formData.rol}
            onChange={handleChange}
            label="Rol"
          >
            <MenuItem value="admin">Administrador</MenuItem>
            <MenuItem value="supervisor">Supervisor</MenuItem>
            <MenuItem value="agente">Agente</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Checkbox
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
            />
          }
          label="Usuario activo"
        />

        <Button type="submit" variant="contained" color="primary">
          Guardar
        </Button>
      </Box>     
    </MainLayout>
  );
}