import { useState } from "react";
import {
    AppBar,
    Box,
    Button,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Toolbar,
    Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const SECTION_LINKS = [
    { label: "Fonctionnalités", id: "features" },
    { label: "Établissements", id: "etablissements" },
];

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    async function handleLogout() {
        setMobileOpen(false);
        await logout();
        navigate("/");
    }

    function scrollToSection(id) {
        setMobileOpen(false);
        if (location.pathname === "/") {
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        } else {
            navigate(`/#${id}`);
        }
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
                <Box
                    component={RouterLink}
                    to="/"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexGrow: 1,
                        textDecoration: "none",
                        minWidth: 0,
                    }}
                >
                    <Box
                        component="img"
                        src="/intellino-logo.png"
                        alt="Intellino"
                        sx={{ height: 32, width: "auto", display: "block" }}
                    />
                    <Typography
                        sx={{
                            fontWeight: 800,
                            color: "primary.main",
                            fontSize: { xs: "1.05rem", sm: "1.2rem" },
                            whiteSpace: "nowrap",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                        }}
                    >
                        EduAfrique
                    </Typography>
                </Box>

                <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0.5 }}>
                    {SECTION_LINKS.map((link) => (
                        <Button
                            key={link.id}
                            color="inherit"
                            size="small"
                            onClick={() => scrollToSection(link.id)}
                            sx={{ px: 1.5, fontSize: "0.875rem" }}
                        >
                            {link.label}
                        </Button>
                    ))}
                </Box>

                <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
                    {user ? (
                        <>
                            <Button
                                component={RouterLink}
                                to="/dashboard"
                                color="inherit"
                                size="small"
                                sx={{ px: 2, fontSize: "0.875rem" }}
                            >
                                Tableau de bord
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleLogout}
                                size="small"
                                sx={{ px: 2, fontSize: "0.875rem" }}
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
                                sx={{ px: 2, fontSize: "0.875rem" }}
                            >
                                Connexion
                            </Button>
                            <Button
                                component={RouterLink}
                                to="/register"
                                variant="contained"
                                size="small"
                                sx={{ px: 2, fontSize: "0.875rem" }}
                            >
                                Inscription
                            </Button>
                        </>
                    )}
                </Box>

                <IconButton
                    color="inherit"
                    aria-label="Ouvrir le menu"
                    onClick={() => setMobileOpen(true)}
                    sx={{ display: { xs: "flex", md: "none" } }}
                >
                    <MenuIcon />
                </IconButton>
            </Toolbar>

            <Drawer
                anchor="right"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                slotProps={{
                    paper: {
                        sx: {
                            width: 260,
                            bgcolor: "background.default",
                            borderLeft: "1px solid",
                            borderColor: "divider",
                        },
                    },
                }}
            >
                <List sx={{ py: 1 }}>
                    {SECTION_LINKS.map((link) => (
                        <ListItemButton key={link.id} onClick={() => scrollToSection(link.id)}>
                            <ListItemText primary={link.label} />
                        </ListItemButton>
                    ))}
                </List>
                <Divider />
                <List sx={{ py: 1 }}>
                    {user ? (
                        <>
                            <ListItemButton
                                component={RouterLink}
                                to="/dashboard"
                                onClick={() => setMobileOpen(false)}
                            >
                                <ListItemText primary="Tableau de bord" />
                            </ListItemButton>
                            <ListItemButton onClick={handleLogout}>
                                <ListItemText primary="Déconnexion" />
                            </ListItemButton>
                        </>
                    ) : (
                        <>
                            <ListItemButton
                                component={RouterLink}
                                to="/login"
                                onClick={() => setMobileOpen(false)}
                            >
                                <ListItemText primary="Connexion" />
                            </ListItemButton>
                            <ListItemButton
                                component={RouterLink}
                                to="/register"
                                onClick={() => setMobileOpen(false)}
                            >
                                <ListItemText
                                    primary="Inscription"
                                    slotProps={{ primary: { sx: { color: "primary.main", fontWeight: 700 } } }}
                                />
                            </ListItemButton>
                        </>
                    )}
                </List>
            </Drawer>
        </AppBar>
    );
}
