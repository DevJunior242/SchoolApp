import { useEffect, useState } from "react";
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
    Tooltip,
    Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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
import DescriptionIcon from "@mui/icons-material/Description";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import BadgeIcon from "@mui/icons-material/Badge";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import StorefrontIcon from "@mui/icons-material/Storefront";
import SmartToyIcon from "@mui/icons-material/SmartToy";
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
import MessagingIcon from "../components/MessagingIcon.jsx";
import VerifyEmailBanner from "../components/VerifyEmailBanner.jsx";

const drawerWidth = 250;
const collapsedDrawerWidth = 72;

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
    { label: "Santé", to: "/dashboard/health", icon: <LocalHospitalIcon /> },
    { label: "Cantine", to: "/dashboard/cafeteria", icon: <RestaurantIcon /> },
    { label: "Bus scolaire", to: "/dashboard/buses", icon: <DirectionsBusIcon /> },
    { label: "Bibliothèque", to: "/dashboard/library", icon: <LocalLibraryIcon /> },
    { label: "Marketplace", to: "/dashboard/marketplace", icon: <StorefrontIcon /> },
    { label: "Assistant IA", to: "/dashboard/ai-assistant", icon: <SmartToyIcon /> },
    { label: "Paramètres", to: "/dashboard/settings", icon: <SettingsIcon /> },
];

// L'infirmier ne gère que le volet santé, pas les membres/profs/classes/paiements.
const INFIRMIER_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Tableau de bord santé", to: "/dashboard/health", icon: <LocalHospitalIcon /> },
    { label: "Élèves", to: "/dashboard/students", icon: <School2Icon /> },
    { label: "Marketplace", to: "/dashboard/marketplace", icon: <StorefrontIcon /> },
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
    { label: "Marketplace", to: "/dashboard/marketplace", icon: <StorefrontIcon /> },
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
    { label: "Bulletins", to: "/dashboard/my-children-bulletins", icon: <DescriptionIcon /> },
    { label: "Cantine", to: "/dashboard/my-children-cafeteria", icon: <RestaurantIcon /> },
    { label: "Bus scolaire", to: "/dashboard/my-children-bus", icon: <DirectionsBusIcon /> },
    { label: "Bibliothèque", to: "/dashboard/my-children-library", icon: <LocalLibraryIcon /> },
    { label: "Cours", to: "/dashboard/my-children-courses", icon: <OndemandVideoIcon /> },
    { label: "Événements", to: "/dashboard/events", icon: <EventIcon /> },
    { label: "Marketplace", to: "/dashboard/marketplace", icon: <StorefrontIcon /> },
];

// L'élève majeur (compte propre) n'a accès qu'à son propre badge cantine
// pour l'instant. Rôle précédemment sans menu dédié : il héritait par
// défaut du menu complet du directeur, inutilisable pour lui (tout 403).
const ELEVE_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Mon badge cantine", to: "/dashboard/my-badge", icon: <BadgeIcon /> },
    { label: "Ma bibliothèque", to: "/dashboard/my-library", icon: <LocalLibraryIcon /> },
    { label: "Mes cours", to: "/dashboard/my-courses", icon: <OndemandVideoIcon /> },
    { label: "Marketplace", to: "/dashboard/marketplace", icon: <StorefrontIcon /> },
];

// Le bibliothécaire ne gère que le module bibliothèque (catalogue,
// prêts/retours, réservations, documents numériques).
const BIBLIOTHECAIRE_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Bibliothèque", to: "/dashboard/library", icon: <LocalLibraryIcon /> },
    { label: "Marketplace", to: "/dashboard/marketplace", icon: <StorefrontIcon /> },
];

// Le chauffeur ne gère que son propre trajet, rien d'autre.
const CHAUFFEUR_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Mon trajet", to: "/dashboard/my-bus-trip", icon: <DirectionsBusIcon /> },
    { label: "Marketplace", to: "/dashboard/marketplace", icon: <StorefrontIcon /> },
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
    { label: "Marketplace", to: "/dashboard/marketplace", icon: <StorefrontIcon /> },
];

const SURVEILLANT_NAV_ITEMS = CENSEUR_NAV_ITEMS;

// Le prestataire n'appartient à aucune école non plus (rôle global, comme
// le superadmin) : sa "Vue d'ensemble" est directement sa fiche.
const PRESTATAIRE_NAV_ITEMS = [
    {
        label: "Vue d'ensemble",
        to: "/dashboard",
        icon: <DashboardIcon />,
        exact: true,
    },
    { label: "Mes articles", to: "/dashboard/my-marketplace-items", icon: <StorefrontIcon /> },
];

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
    { label: "Marketplace", to: "/dashboard/marketplace-moderation", icon: <StorefrontIcon /> },
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
    { label: "Cantine", to: "/dashboard/cafeteria", icon: <RestaurantIcon /> },
    { label: "Marketplace", to: "/dashboard/marketplace", icon: <StorefrontIcon /> },
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
    { label: "Cantine", to: "/dashboard/cafeteria", icon: <RestaurantIcon /> },
    { label: "Marketplace", to: "/dashboard/marketplace", icon: <StorefrontIcon /> },
];

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const { mode, toggleMode } = useThemeMode();
    const { schoolUsers, loading: schoolUsersLoading } = useSchools();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");

    useEffect(() => {
        localStorage.setItem("sidebar_collapsed", String(collapsed));
    }, [collapsed]);

    const currentDrawerWidth = collapsed ? collapsedDrawerWidth : drawerWidth;

    const isSuperAdmin = user.role?.slug === "superadmin";
    const isPrestataire = user.role?.slug === "prestataire";
    const currentRole = schoolUsers.find((su) => su.school.id === user.current_school_id)?.role?.slug;
    const NAV_ITEMS_BY_ROLE = {
        professeur: PROFESSEUR_NAV_ITEMS,
        parent: PARENT_NAV_ITEMS,
        secretaire: SECRETAIRE_NAV_ITEMS,
        comptable: COMPTABLE_NAV_ITEMS,
        censeur: CENSEUR_NAV_ITEMS,
        surveillant: SURVEILLANT_NAV_ITEMS,
        infirmier: INFIRMIER_NAV_ITEMS,
        eleve: ELEVE_NAV_ITEMS,
        chauffeur: CHAUFFEUR_NAV_ITEMS,
        bibliothecaire: BIBLIOTHECAIRE_NAV_ITEMS,
    };
    // Tant que le rôle n'est pas connu, on n'affiche que Vue d'ensemble pour
    // éviter un flash vers un lien auquel le rôle réel n'a pas accès. Le
    // superadmin et le prestataire ont un menu dédié basé sur leur rôle
    // global (users.role_id), indépendant des écoles auxquelles ils
    // pourraient appartenir.
    const navItems = isSuperAdmin
        ? SUPERADMIN_NAV_ITEMS
        : isPrestataire
            ? PRESTATAIRE_NAV_ITEMS
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

    function renderDrawerContent(isCollapsed) {
        return (
            <Box
                sx={{
                    height: "100%",
                    bgcolor: "background.default",
                    borderRight: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Toolbar sx={{ px: isCollapsed ? 1 : 2.5, py: 2, justifyContent: isCollapsed ? "center" : "space-between" }}>
                    {!isCollapsed && (
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
                    )}
                    {/* Le repli du menu ne concerne que le tiroir permanent (desktop) :
                        sur mobile le tiroir est temporaire, toujours en pleine largeur. */}
                    <IconButton
                        onClick={() => setCollapsed((prev) => !prev)}
                        size="small"
                        aria-label={isCollapsed ? "Déplier le menu" : "Replier le menu"}
                        sx={{ display: { xs: "none", sm: "inline-flex" } }}
                    >
                        {isCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                    </IconButton>
                </Toolbar>
                <Divider />
                <Box sx={{ px: isCollapsed ? 0.5 : 1.5, py: 2 }}>
                    {!isCollapsed && (
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
                    )}
                    <List
                        sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                    >
                        {navItems.map((item) => {
                            const button = (
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
                                        justifyContent: isCollapsed ? "center" : "flex-start",
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
                                        sx={{ minWidth: isCollapsed ? "auto" : 36, color: "inherit" }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    {!isCollapsed && (
                                        <ListItemText
                                            primary={item.label}
                                            primaryTypographyProps={{ fontWeight: 600 }}
                                        />
                                    )}
                                    {!isCollapsed && item.disabled && (
                                        <Chip
                                            label="Bientôt"
                                            size="small"
                                            variant="outlined"
                                        />
                                    )}
                                </ListItemButton>
                            );

                            return isCollapsed ? (
                                <Tooltip key={item.to} title={item.label} placement="right">
                                    <span>{button}</span>
                                </Tooltip>
                            ) : (
                                button
                            );
                        })}
                    </List>
                </Box>
            </Box>
        );
    }

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
                    width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
                    ml: { sm: `${currentDrawerWidth}px` },
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: alpha(theme.palette.background.default, 0.9),
                    backdropFilter: "blur(14px)",
                    transition: theme.transitions.create(["width", "margin"], {
                        duration: theme.transitions.duration.shortest,
                    }),
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

                    {!isSuperAdmin && !schoolUsersLoading && (
                        <MessagingIcon
                            schoolId={user.current_school_id}
                            isStaff={currentRole === "directeur" || currentRole === "secretaire"}
                        />
                    )}

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
                sx={{ width: { sm: currentDrawerWidth }, flexShrink: { sm: 0 } }}
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
                    {renderDrawerContent(false)}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={(theme) => ({
                        display: { xs: "none", sm: "block" },
                        "& .MuiDrawer-paper": {
                            width: currentDrawerWidth,
                            bgcolor: "background.default",
                            borderRight: "1px solid",
                            borderColor: "divider",
                            overflowX: "hidden",
                            transition: theme.transitions.create("width", {
                                duration: theme.transitions.duration.shortest,
                            }),
                        },
                    })}
                    open
                >
                    {renderDrawerContent(collapsed)}
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={(theme) => ({
                    flexGrow: 1,
                    // Sans minWidth: 0, un enfant plus large que le viewport (ex.
                    // des onglets défilants avec de longs libellés) étire cet
                    // élément flex au lieu de contenir son propre scroll, ce qui
                    // fait déborder toute la page horizontalement sur mobile.
                    minWidth: 0,
                    width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
                    bgcolor: "background.default",
                    transition: theme.transitions.create("width", {
                        duration: theme.transitions.duration.shortest,
                    }),
                })}
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
