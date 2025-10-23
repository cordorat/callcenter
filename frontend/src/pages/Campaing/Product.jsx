import * as React from "react";
import { Container, Button, Typography } from "@mui/material";
import CreateProductModal from "../../components/campaing/CreateProductModal.jsx";

export default function ProductsPage() {
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Gestión de Productos
      </Typography>

      <Button variant="contained" color="primary" onClick={handleOpen}>
        Nuevo Producto
      </Button>

      {/* Modal reutilizable */}
      <CreateProductModal open={open} onClose={handleClose} />
    </Container>
  );
}
