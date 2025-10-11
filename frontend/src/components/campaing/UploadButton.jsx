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
        variant="contained"
        component="label"
        color="primary"
        startIcon={<UploadFileIcon />}
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
