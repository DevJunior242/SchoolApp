import { useState } from "react";
import {
    AppBar,
    Avatar,
    Box,
    Chip,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/SpaceDashboard";
import ApartmentIcon from "@mui/icons-material/Apartment";
import GroupsIcon from "@mui/icons-material/Groups";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PersonIcon from "@mui/icons-material/Person";
import School2Icon from "@mui/icons-material/School";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import PaymentsIcon from "@mui/icons-material/Payments";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import ScheduleIcon from "@mui/icons-material/Schedule";
import EventIcon from "@mui/icons-material/Event";
import SettingsIcon from "@mui/icons-material/Settings";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { alpha } from "@mui/material/styles";
import {
    Link as RouterLink,
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useThemeMode } from "../context/ThemeModeContext.jsx";
import { useSchools } from "../hooks/useSchools.js";
import NotificationCenter from "../components/NotificationCenter.jsx";
import VerifyEmailBanner from "../components/VerifyEmailBanner.jsx";

const drawerWidth = 250;

const DIRECTEUR_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Mes écoles", to: "/dashboard/schools", icon: <ApartmentIcon /> },
    { label: "Événements", to: "/dashboard/events", icon: <EventIcon /> },
    { label: "Membres", to: "/dashboard/members", icon: <GroupsIcon /> },
    { label: "Classes", to: "/dashboard/classes", icon: <MenuBookIcon /> },
    { label: "Professeurs", to: "/dashboard/teachers", icon: <PersonIcon /> },
    { label: "Élèves", to: "/dashboard/students", icon: <School2Icon /> },
    { label: "Parents", to: "/dashboard/parents", icon: <FamilyRestroomIcon /> },
    { label: "Paiements", to: "/dashboard/payments", icon: <PaymentsIcon /> },
    { label: "Justifications d'absences", to: "/dashboard/attendance-justifications", icon: <FactCheckIcon /> },
    { label: "Demandes d'inscription", to: "/dashboard/enrollment-requests", icon: <HowToRegIcon /> },
    { label: "Paramètres", to: "/dashboard/settings", icon: <SettingsIcon /> },
];

const PROFESSEUR_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Mes cours", to: "/dashboard/my-assignments", icon: <MenuBookOutlinedIcon /> },
    { label: "Mon emploi du temps", to: "/dashboard/my-timetable", icon: <ScheduleIcon /> },
    { label: "Événements", to: "/dashboard/events", icon: <EventIcon /> },
];

const PARENT_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Paiements", to: "/dashboard/my-children-payments", icon: <PaymentsIcon /> },
    { label: "Absences de mes enfants", to: "/dashboard/my-children-attendances", icon: <EventBusyIcon /> },
    { label: "Événements", to: "/dashboard/events", icon: <EventIcon /> },
];

// Le censeur et le surveillant général valident les justifications
// d'absences, mais ne gèrent ni les membres/profs/classes ni les paiements.
const CENSEUR_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Événements", to: "/dashboard/events", icon: <EventIcon /> },
    { label: "Justifications d'absences", to: "/dashboard/attendance-justifications", icon: <FactCheckIcon /> },
];

const SURVEILLANT_NAV_ITEMS = CENSEUR_NAV_ITEMS;

// Le superadmin de la plateforme n'appartient à aucune école : son rôle
// vient de users.role_id (rôle global), pas du pivot school_users.
const SUPERADMIN_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Écoles", to: "/dashboard/all-schools", icon: <ApartmentIcon /> },
    { label: "Clés d'activation", to: "/dashboard/activation-keys", icon: <VpnKeyIcon /> },
];

// Le secrétariat inscrit les élèves et encaisse les paiements, mais ne gère
// ni les membres/profs/classes ni les moyens de paiement/tranches.
const SECRETAIRE_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Élèves", to: "/dashboard/students", icon: <School2Icon /> },
    { label: "Paiements", to: "/dashboard/payments", icon: <PaymentsIcon /> },
    { label: "Événements", to: "/dashboard/events", icon: <EventIcon /> },
    { label: "Demandes d'inscription", to: "/dashboard/enrollment-requests", icon: <HowToRegIcon /> },
];

// Le comptable consulte les élèves et gère intégralement les paiements
// (moyens, tranches, confirmation), mais ne gère pas membres/profs/classes.
const COMPTABLE_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Élèves", to: "/dashboard/students", icon: <School2Icon /> },
    { label: "Paiements", to: "/dashboard/payments", icon: <PaymentsIcon /> },
    { label: "Événements", to: "/dashboard/events", icon: <EventIcon /> },
];

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const { mode, toggleMode } = useThemeMode();
    const { schoolUsers, loading: schoolUsersLoading } = useSchools();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const isSuperAdmin = user.role?.slug === "superadmin";
    const currentRole = schoolUsers.find((su) => su.school.id === user.current_school_id)?.role?.slug;
    const NAV_ITEMS_BY_ROLE = {
        professeur: PROFESSEUR_NAV_ITEMS,
        parent: PARENT_NAV_ITEMS,
        secretaire: SECRETAIRE_NAV_ITEMS,
        comptable: COMPTABLE_NAV_ITEMS,
        censeur: CENSEUR_NAV_ITEMS,
        surveillant: SURVEILLANT_NAV_ITEMS,
    };
    // Tant que le rôle n'est pas connu, on n'affiche que Vue d'ensemble pour
    // éviter un flash vers un lien auquel le rôle réel n'a pas accès. Le
    // superadmin a un menu dédié basé sur son rôle global, indépendant des
    // écoles auxquelles il pourrait appartenir.
    const navItems = isSuperAdmin
        ? SUPERADMIN_NAV_ITEMS
        : schoolUsersLoading
            ? [DIRECTEUR_NAV_ITEMS[0]]
            : (NAV_ITEMS_BY_ROLE[currentRole] ?? DIRECTEUR_NAV_ITEMS);

    async function handleLogout() {
        setAnchorEl(null);
        await logout();
        navigate("/");
    }

    function isActive(item) {
        return item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
    }

    const drawerContent = (
        <Box
            sx={{
                height: "100%",
                bgcolor: "background.default",
                borderRight: "1px solid",
                borderColor: "divider",
            }}
        >
            <Toolbar sx={{ px: 2.5, py: 2 }}>
                <Typography
                    component={RouterLink}
                    to="/"
                    sx={{
                        fontWeight: 800,
                        color: "primary.main",
                        textDecoration: "none",
                        fontSize: "1.05rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                    }}
                >
                    EduAfrique
                </Typography>
            </Toolbar>
            <Divider />
            <Box sx={{ px: 1.5, py: 2 }}>
                <Typography
                    variant="caption"
                    sx={{
                        px: 1.5,
                        mb: 1,
                        display: "block",
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                    }}
                >
                    Navigation
                </Typography>
                <List
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                    {navItems.map((item) => (
                        <ListItemButton
                            key={item.to}
                            component={RouterLink}
                            to={item.disabled ? "#" : item.to}
                            disabled={item.disabled}
                            selected={isActive(item)}
                            onClick={() => setMobileOpen(false)}
                            sx={(theme) => ({
                                borderRadius: 2,
                                px: 1.5,
                                py: 1,
                                color: isActive(item)
                                    ? "primary.main"
                                    : "text.primary",
                                "&.Mui-selected": {
                                    bgcolor: "rgba(201, 162, 39, 0.12)",
                                    color: "primary.main",
                                },
                                "&:hover": {
                                    bgcolor: alpha(theme.palette.text.primary, 0.04),
                                },
                            })}
                        >
                            <ListItemIcon
                                sx={{ minWidth: 36, color: "inherit" }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{ fontWeight: 600 }}
                            />
                            {item.disabled && (
                                <Chip
                                    label="Bientôt"
                                    size="small"
                                    variant="outlined"
                                />
                            )}
                        </ListItemButton>
                    ))}
                </List>
            </Box>
        </Box>
    );

    return (
        <Box
            sx={{
                display: "flex",
                minHeight: "100vh",
                bgcolor: "background.default",
            }}
        >
            <AppBar
                position="fixed"
                elevation={0}
                sx={(theme) => ({
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: alpha(theme.palette.background.default, 0.9),
                    backdropFilter: "blur(14px)",
                })}
            >
                <Toolbar sx={{ gap: 1, px: { xs: 2, sm: 3 } }}>
                    <IconButton
                        color="inherit"
                        edge="start"
                        aria-label="Ouvrir le menu"
                        onClick={() => setMobileOpen(true)}
                        sx={{ display: { sm: "none" } }}
                    >
                        <MenuIcon />
                    </IconButton>

                    <Typography
                        variant="subtitle1"
                        sx={{ flexGrow: 1, fontWeight: 700 }}
                        noWrap
                    >
                        {isSuperAdmin ? "Administration de la plateforme" : (user.current_school?.name ?? "Aucune école active")}
                    </Typography>

                    <IconButton
                        color="inherit"
                        aria-label={mode === "dark" ? "Activer le thème clair" : "Activer le thème sombre"}
                        onClick={toggleMode}
                        sx={{ mr: 1 }}
                    >
                        {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                    </IconButton>

                    <NotificationCenter />

                    <IconButton
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                        size="small"
                    >
                        <Avatar
                            sx={{
                                width: 36,
                                height: 36,
                                bgcolor: "primary.main",
                                color: "background.default",
                                fontSize: "0.95rem",
                                fontWeight: 700,
                            }}
                        >
                            {user.fullname?.charAt(0).toUpperCase()}
                        </Avatar>
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                    >
                        <MenuItem disabled sx={{ opacity: "1 !important" }}>
                            {user.fullname}
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleLogout}>
                            <ListItemIcon>
                                <LogoutIcon fontSize="small" />
                            </ListItemIcon>
                            Déconnexion
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>

            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: "block", sm: "none" },
                        "& .MuiDrawer-paper": {
                            width: drawerWidth,
                            bgcolor: "background.default",
                            borderRight: "1px solid",
                            borderColor: "divider",
                        },
                    }}
                >
                    {drawerContent}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: "none", sm: "block" },
                        "& .MuiDrawer-paper": {
                            width: drawerWidth,
                            bgcolor: "background.default",
                            borderRight: "1px solid",
                            borderColor: "divider",
                        },
                    }}
                    open
                >
                    {drawerContent}
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    bgcolor: "background.default",
                }}
            >
                <Toolbar />
                <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 4 } }}>
                    <VerifyEmailBanner />
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
