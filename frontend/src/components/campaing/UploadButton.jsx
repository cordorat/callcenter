//Path: frontend/src/components/campaing/UploadButton.jsx

import React from "react";
import { Button, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";

const UploadButton = ({ onFileSelect }) => {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)");
      event.target.value = "";
      return;
    }

    if (onFileSelect) onFileSelect(file);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <Button
        variant="outlined"
        component="label"
        startIcon={<UploadFileIcon />}
        sx={{
          borderColor: '#0C155A',
          borderWidth: '2px',
          color: '#0C155A',
          backgroundColor: '#EBF5FE',
          borderRadius: '10px',
          textTransform: 'none',
          fontSize: '0.95rem',
          fontWeight: 600,
          px: 3,
          py: 1.2,
          boxShadow: '0 2px 8px rgba(12, 21, 90, 0.15)',
          '&:hover': {
            borderWidth: '2px',
            borderColor: '#0C155A',
            backgroundColor: '#D3E8FB',
            boxShadow: '0 4px 12px rgba(12, 21, 90, 0.25)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        Subir Base de Datos
        <input
          type="file"
          hidden
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
        />
      </Button>
    </div>
  );
};

export default UploadButton;
