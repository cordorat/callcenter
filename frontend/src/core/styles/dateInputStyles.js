/**
 * Estilos estandarizados para inputs de fecha en toda la aplicación
 * Basado en SearchAndFilters.jsx para consistencia visual
 */

export const getDateInputSx = (theme) => ({
  minWidth: 190,
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    backgroundColor:
      theme.palette.mode === "light" ? "#F5F7FA" : "rgba(255,255,255,0.06)",
    "& fieldset": {
      borderColor:
        theme.palette.mode === "light"
          ? "rgba(12,21,90,0.16)"
          : "rgba(255,255,255,0.18)",
      borderWidth: 2,
    },
    "&:hover fieldset": { 
      borderColor: theme.palette.primary.main 
    },
    "&.Mui-focused fieldset": { 
      borderColor: theme.palette.primary.main 
    },
    height: 44,
  },
});

/**
 * Props para InputLabelProps en TextField de fecha
 */
export const getDateInputLabelProps = (theme) => ({
  shrink: true,
  sx: {
    color: theme.palette.mode === "dark" ? "#FFFFFF" : theme.palette.primary.dark,
    fontWeight: 700,
  },
});
