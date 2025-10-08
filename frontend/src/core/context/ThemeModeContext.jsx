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
            main: "#2196F3", // Color principal para botones, links, etc.
          },
          secondary: {
            main: "#4FC3F7", // Color secundario
          },
          background: {
            default: mode === "light" ? "#D3E8FB" : "#121212", // Fondo general
            paper: mode === "light" ? "#EBF5FE" : "#1E1E1E",   // Fondo de componentes (cards, drawer)
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: { fontFamily: '"Poppins", sans-serif', fontWeight: 700 },
          h2: { fontFamily: '"Poppins", sans-serif', fontWeight: 600 },
          h3: { fontFamily: '"Arimo", sans-serif', fontWeight: 600 },
          h4: { fontFamily: '"Arimo", sans-serif', fontWeight: 500 },
          h5: { fontFamily: '"Arimo", sans-serif', fontWeight: 500 },
          h6: { fontFamily: '"Arimo", sans-serif', fontWeight: 500 },
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
