import * as React from "react";
import { Box, Button, Modal, TextField, Typography } from "@mui/material";
import { useTheme } from '@mui/material/styles';

export default function BasicModal() {
  const [open, setOpen] = React.useState(false);
  const theme = useTheme();
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Button variant="contained" onClick={handleOpen}>
        Abrir modal
      </Button>

      <Modal open={open} onClose={handleClose}>
        <Box sx={style}>
          <Typography variant="h6" component="h2">
            Crear Producto
          </Typography>
          <Box sx={{ mb: 3 }}>
            <TextField
                fullWidth
                label="Nombre del Producto"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingrese el nombre del producto"
                required
            />
          </Box>
          <Box sx={{ mb: 3 }}>
            <TextField
                fullWidth
                label="Descripcion del Producto"
                value={descripcion}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingrese la descripcion del producto"
                required
            />
          </Box>
          <Box sx={{ mb: 3 }}>
            <NumberField
                fullWidth
                label="Precio del Producto"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingrese el precio del producto"
                required
            />
          </Box>
          <Button sx={{ mt: 2, color:theme.palette.text.secondary }} onClick={handleClose} variant="contained">
            Cerrar
          </Button>
          <Button sx={{ mt: 2, ml: 2, color:theme.palette.text.primary }} variant="contained" >
            Guardar Producto
          </Button>
        </Box>
      </Modal>
    </>
  );
}
