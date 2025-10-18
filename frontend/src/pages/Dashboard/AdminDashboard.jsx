// PATH: src/pages/Dashboard/AdminDashboard.jsx
import * as React from "react";
import MainLayout from "@/core/components/layout/MainLayout";
import {
  Box,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PhoneMissedIcon from "@mui/icons-material/PhoneMissed";
import { getKpiOverview } from "@/core/api/Kpis";
import { useTheme } from "@mui/material/styles";

import "./Dashboard.css";

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function AdminDashboard() {
  const theme = useTheme();

  return (
    <MainLayout title="Panel de Control">
      <Box>
        <div>
          <h2 sx={{ color: theme.palette.text.primary }}>Panel de Control</h2>
        </div>
      </Box>
    </MainLayout>
  );
}
