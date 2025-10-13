//Path: frontend/src/components/campaing/UploadButton.jsx

import React from "react";
import { Button, Tooltip, Typography } from "@mui/material";
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
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Tooltip 
          title="Sube un archivo CSV (.csv) con la base de datos de Clientes"
          placement="bottom"
          arrow
          slotProps={{
            tooltip: {
              sx: {
                bgcolor: '#0C155A',
                fontSize: '0.875rem',
                fontWeight: 500,
                py: 1,
                px: 1.5,
                borderRadius: '8px',
                maxWidth: '280px',
                textAlign: 'center',
              }
            },
            arrow: {
              sx: {
                color: '#0C155A',
              }
            }
          }}
        >
          <Button
            variant="outlined"
            component="label"
            sx={{
              borderColor: '#0C155A',
              borderWidth: '2px',
              color: 'white',
              backgroundColor: '#0C155A',
              borderRadius: '50%',
              minWidth: '56px',
              width: '56px',
              height: '56px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(12, 21, 90, 0.2)',
              '&:hover': {
                borderWidth: '2px',
                borderColor: '#0C155A',
                backgroundColor: '#1a2b7a',
                boxShadow: '0 4px 12px rgba(12, 21, 90, 0.3)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease',
              '& .MuiSvgIcon-root': {
                fontSize: '1.8rem',
              },
            }}
          >
            <UploadFileIcon />
            <input
              type="file"
              hidden
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
            />
          </Button>
        </Tooltip>
      </div>
    </>
  );
};

export default UploadButton;
