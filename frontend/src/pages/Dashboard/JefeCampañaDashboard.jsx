// PATH: src/pages/Dashboard/JefeCampañaDashboard.jsx
import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import { Box, Typography } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";
import { useTheme } from "@mui/material/styles";

export default function JefeCampañaDashboard() {
  const theme = useTheme();

  return (
    <MainLayout title="Panel de Control">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="80vh"
        textAlign="center"
      >
        <Typography
          variant="h4"
          sx={{ color: theme.palette.text.primary, mb: 2 }}
        >
          Panel de Control
        </Typography>

        <ConstructionIcon
          sx={{
            fontSize: 100,
            color: theme.palette.warning.main,
            mb: 2,
          }}
        />

        <Typography variant="h6" sx={{ color: theme.palette.text.secondary }}>
          Esta sección se encuentra en construcción.
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.disabled }}>
          Próximamente podrás ver las métricas y estadísticas del sistema.
        </Typography>
      </Box>
    </MainLayout>
  );
}
