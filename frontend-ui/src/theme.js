import { createTheme } from "@mui/material/styles";

const theme = createTheme({
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
});

export default theme;
