import React from "react";
import { Tooltip, Button, useTheme } from "@mui/material";


export default function FloatingActionButton({
  title,
  icon,
  onClick,
  color = "primary",
}) {
  return (
    <Tooltip
      title={title}
      placement="bottom"
      arrow
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: (theme) => theme.palette[color].main,
            fontSize: "0.875rem",
            fontWeight: 500,
            py: 1,
            px: 1.5,
            borderRadius: "8px",
            textAlign: "center",
          },
        },
        arrow: {
          sx: {
            color: (theme) => theme.palette[color].main,
          },
        },
      }}
    >
      <Button
        variant="contained"
        onClick={onClick}
        sx={{
          backgroundColor: (theme) => theme.palette[color].main,
          color: "white",
          borderRadius: "50%",
          minWidth: "48px",
          width: "48px",
          height: "48px",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: (theme) =>
            theme.palette.mode === "light"
              ? "0 2px 8px rgba(12, 21, 90, 0.2)"
              : "0 2px 8px rgba(0, 0, 0, 0.5)",
          "&:hover": {
            backgroundColor: (theme) => theme.palette[color].dark,
            boxShadow: (theme) =>
              theme.palette.mode === "light"
                ? "0 4px 12px rgba(12, 21, 90, 0.3)"
                : "0 4px 12px rgba(0, 0, 0, 0.7)",
            transform: "translateY(-2px)",
          },
          transition: "all 0.2s ease",
          "& .MuiSvgIcon-root": {
            fontSize: "1.5rem",
          },
        }}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}
