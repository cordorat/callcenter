import { createContext, useContext, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline, createTheme } from "@mui/material";

const ThemeModeContext = createContext();

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState("light");

  const toggleMode = () => setMode((prev) => (prev === "light" ? "dark" : "light"));

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === "light" ? "#0C155A" : "#4A8FE7", // Color principal para botones, links, etc.
          },
          secondary: {
            main: mode === "light" ? "#BDBCC2" : "#A4A4A8", // Color secundario
          },
          background: {
            default: mode === "light" ? "#D3E8FB" : "#0C111B", // fondo general
            paper: mode === "light" ? "#FFFFFF" : "#182030",   // Fondo de componentes (cards, drawer)
          },
          text: {
            primary: mode === "light" ? "#0C155A" : "#E6E9EF",
            secondary: mode === "light" ? "#4F4F4F" : "#B0B5C0",
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: { fontFamily: '"Poppins", sans-serif', fontWeight: 700 },
          h2: { fontFamily: '"Poppins", sans-serif', fontWeight: 600 },
          h3: { fontFamily: '"Poppins", sans-serif', fontWeight: 600 },
          h4: { fontFamily: '"Poppins", sans-serif', fontWeight: 500 },
          h5: { fontFamily: '"Poppins", sans-serif', fontWeight: 500 },
          h6: { fontFamily: '"Poppins", sans-serif', fontWeight: 500 },
        },
      }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeModeContext);
