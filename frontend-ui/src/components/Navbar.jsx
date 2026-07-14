import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await logout();
        navigate("/");
    }

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                bgcolor: "rgba(5,5,5,0.95)",
                backdropFilter: "blur(14px)",
                borderBottom: "1px solid",
                borderColor: "divider",
            }}
        >
            <Toolbar
                sx={{
                    maxWidth: 1280,
                    width: "100%",
                    mx: "auto",
                    px: { xs: 1.5, sm: 2 },
                    gap: 1,
                }}
            >
                <Typography
                    component={RouterLink}
                    to="/"
                    sx={{
                        flexGrow: 1,
                        fontWeight: 800,
                        color: "primary.main",
                        textDecoration: "none",
                        fontSize: { xs: "1.05rem", sm: "1.2rem" },
                        whiteSpace: "nowrap",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                    }}
                >
                    EduAfrique
                </Typography>

                <Box sx={{ display: "flex", gap: { xs: 0.5, sm: 1 } }}>
                    {user ? (
                        <>
                            <Button
                                component={RouterLink}
                                to="/dashboard"
                                color="inherit"
                                size="small"
                                sx={{
                                    px: { xs: 1, sm: 2 },
                                    fontSize: { xs: "0.72rem", sm: "0.875rem" },
                                    minWidth: 0,
                                }}
                            >
                                Tableau de bord
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleLogout}
                                size="small"
                                sx={{
                                    px: { xs: 1, sm: 2 },
                                    fontSize: { xs: "0.72rem", sm: "0.875rem" },
                                    minWidth: 0,
                                }}
                            >
                                Déconnexion
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                component={RouterLink}
                                to="/login"
                                color="inherit"
                                size="small"
                                sx={{
                                    px: { xs: 1, sm: 2 },
                                    fontSize: { xs: "0.72rem", sm: "0.875rem" },
                                    minWidth: 0,
                                }}
                            >
                                Connexion
                            </Button>
                            <Button
                                component={RouterLink}
                                to="/register"
                                variant="contained"
                                size="small"
                                sx={{
                                    px: { xs: 1, sm: 2 },
                                    fontSize: { xs: "0.72rem", sm: "0.875rem" },
                                    minWidth: 0,
                                }}
                            >
                                Inscription
                            </Button>
                        </>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
}
