//Path: src/components/campaing/Teams.jsx
//Componente para mostrar la lista de equipos de la campaña

import * as React from "react";
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';


export default function Teams() {
  const theme = useTheme();
  
  return (
    <Box>
      <Typography 
        variant="h6" 
        gutterBottom
        sx={{ color: theme.palette.text.primary }}
      >
        Lista de Equipos
      </Typography>

    </Box>
  );
}
