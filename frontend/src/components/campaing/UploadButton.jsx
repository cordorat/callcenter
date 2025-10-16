//Path: frontend/src/components/campaing/UploadButton.jsx

import React from "react";
import { Button, Tooltip, Typography } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import UploadFileIcon from "@mui/icons-material/UploadFile";

const UploadButton = ({ onFileSelect }) => {
  const theme = useTheme();
  
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
                bgcolor: (theme) => theme.palette.primary.main,
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
                color: (theme) => theme.palette.primary.main,
              }
            }
          }}
        >
          <Button
            variant="outlined"
            component="label"
            sx={{
              borderColor: (theme) => theme.palette.primary.main,
              borderWidth: '2px',
              color: 'white',
              backgroundColor: (theme) => theme.palette.primary.main,
              borderRadius: '50%',
              minWidth: '56px',
              width: '56px',
              height: '56px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.palette.mode === 'light' 
                ? '0 2px 8px rgba(12, 21, 90, 0.2)' 
                : '0 2px 8px rgba(0, 0, 0, 0.5)',
              '&:hover': {
                borderWidth: '2px',
                borderColor: (theme) => theme.palette.primary.main,
                backgroundColor: (theme) => theme.palette.primary.dark,
                boxShadow: theme.palette.mode === 'light' 
                  ? '0 4px 12px rgba(12, 21, 90, 0.3)' 
                  : '0 4px 12px rgba(0, 0, 0, 0.7)',
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
