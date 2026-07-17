import { createTheme } from "@mui/material/styles";

const shared = {
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 999,
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
};

const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: "dark",
    primary: {
      main: "#C9A227",
      light: "#E2B84A",
      dark: "#8F6A10",
      contrastText: "#050505",
    },
    secondary: {
      main: "#F5F1E8",
      contrastText: "#050505",
    },
    background: {
      default: "#050505",
      paper: "#121212",
    },
    text: {
      primary: "#F5F1E8",
      secondary: "#C7C0B2",
    },
    divider: "rgba(255,255,255,0.12)",
  },
});

const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: "light",
    primary: {
      main: "#B4890F",
      light: "#C9A227",
      dark: "#8F6A10",
      contrastText: "#050505",
    },
    secondary: {
      main: "#1A1A1A",
      contrastText: "#F5F1E8",
    },
    background: {
      default: "#F7F5F0",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A1A1A",
      secondary: "#5C5648",
    },
    divider: "rgba(0,0,0,0.12)",
  },
});

export function getTheme(mode) {
  return mode === "light" ? lightTheme : darkTheme;
}

export default darkTheme;
