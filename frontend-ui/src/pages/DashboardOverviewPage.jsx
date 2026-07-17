import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Grid,
    Link as MuiLink,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import { motion } from "motion/react";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import PublicIcon from "@mui/icons-material/Public";
import Diversity3Icon from "@mui/icons-material/Diversity3";
import BadgeIcon from "@mui/icons-material/Badge";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import School2Icon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PersonIcon from "@mui/icons-material/Person";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import PaymentsIcon from "@mui/icons-material/Payments";
import GroupsIcon from "@mui/icons-material/Groups";
import EventIcon from "@mui/icons-material/Event";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { useSchools } from "../hooks/useSchools.js";
import SuperAdminOverviewPage from "./SuperAdminOverviewPage.jsx";

const STAFF_ROLE_SLUGS = ["directeur", "censeur", "surveillant", "secretaire", "comptable"];

const QUICK_ACTIONS_BY_ROLE = {
    directeur: [
        { label: "Ajouter un membre", to: "/dashboard/members", icon: <GroupsIcon /> },
        { label: "Ajouter une classe", to: "/dashboard/classes", icon: <MenuBookIcon /> },
        { label: "Inscrire des élèves", to: "/dashboard/students", icon: <School2Icon /> },
        { label: "Créer un événement", to: "/dashboard/events", icon: <EventIcon /> },
    ],
    secretaire: [
        { label: "Inscrire des élèves", to: "/dashboard/students", icon: <School2Icon /> },
        { label: "Encaisser un paiement", to: "/dashboard/payments", icon: <PaymentsIcon /> },
        { label: "Créer un événement", to: "/dashboard/events", icon: <EventIcon /> },
    ],
    comptable: [
        { label: "Encaisser un paiement", to: "/dashboard/payments", icon: <PaymentsIcon /> },
        { label: "Créer un événement", to: "/dashboard/events", icon: <EventIcon /> },
    ],
    censeur: [
        { label: "Justifications d'absences", to: "/dashboard/attendance-justifications", icon: <FactCheckIcon /> },
        { label: "Créer un événement", to: "/dashboard/events", icon: <EventIcon /> },
    ],
    surveillant: [
        { label: "Justifications d'absences", to: "/dashboard/attendance-justifications", icon: <FactCheckIcon /> },
        { label: "Créer un événement", to: "/dashboard/events", icon: <EventIcon /> },
    ],
    professeur: [
        { label: "Mes cours", to: "/dashboard/my-assignments", icon: <MenuBookOutlinedIcon /> },
        { label: "Mon emploi du temps", to: "/dashboard/my-timetable", icon: <ScheduleIcon /> },
        { label: "Événements", to: "/dashboard/events", icon: <EventIcon /> },
    ],
    parent: [
        { label: "Paiements", to: "/dashboard/my-children-payments", icon: <PaymentsIcon /> },
        { label: "Absences de mes enfants", to: "/dashboard/my-children-attendances", icon: <EventBusyIcon /> },
        { label: "Événements", to: "/dashboard/events", icon: <EventIcon /> },
    ],
};

export default function DashboardOverviewPage() {
    const { user } = useAuth();
    const { schoolUsers, loading, error } = useSchools();

    const current = schoolUsers.find(
        (su) => su.school.id === user.current_school_id,
    );
    const isStaff = Boolean(current) && STAFF_ROLE_SLUGS.includes(current.role?.slug);
    const quickActions = current ? (QUICK_ACTIONS_BY_ROLE[current.role?.slug] ?? []) : [];
    const { data: summary, error: summaryError } = useApiGet(
        isStaff ? `/schools/${current.school.id}/dashboard-summary` : null,
        { enabled: isStaff },
    );

    // Le superadmin n'a pas d'école : son tableau de bord est une vue
    // d'ensemble de la plateforme, pas ce résumé pensé pour le personnel
    // d'école.
    if (user.role?.slug === "superadmin") {
        return <SuperAdminOverviewPage />;
    }

    if (loading)
        return <Typography color="text.secondary">Chargement...</Typography>;

    if (error) {
        return (
            <Container maxWidth="sm">
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    if (!current) {
        return (
            <Container maxWidth="sm">
                <Paper
                    sx={(theme) => ({
                        p: 4,
                        textAlign: "center",
                        bgcolor: alpha(theme.palette.text.primary, 0.03),
                        border: "1px solid",
                        borderColor: "divider",
                    })}
                >
                    <Typography variant="h5" gutterBottom>
                        Aucune école active
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        Créez ou rejoignez une école depuis l'accueil pour
                        accéder à votre tableau de bord.
                    </Typography>
                    <MuiLink component={RouterLink} to="/" color="primary">
                        Aller à l'accueil
                    </MuiLink>
                </Paper>
            </Container>
        );
    }

    const stats = [
        {
            icon: <BadgeIcon color="primary" />,
            label: "Rôle",
            value: current.role?.name,
        },
        {
            icon: <ToggleOnIcon color="primary" />,
            label: "Statut",
            value: current.status === 1 ? "Actif" : "Inactif",
        },
        {
            icon: <PublicIcon color="primary" />,
            label: "Pays",
            value: current.school.country?.name,
        },
        {
            icon: <Diversity3Icon color="primary" />,
            label: "Écoles rejointes",
            value: schoolUsers.length,
        },
    ];

    return (
        <Box>
            <Paper
                sx={(theme) => ({
                    p: { xs: 3, md: 4 },
                    mb: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: alpha(theme.palette.text.primary, 0.03),
                })}
            >
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    sx={{
                        justifyContent: "space-between",
                        alignItems: { xs: "flex-start", md: "center" },
                    }}
                >
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                color: "primary.main",
                                textTransform: "uppercase",
                                letterSpacing: "0.12em",
                            }}
                        >
                            Tableau de bord
                        </Typography>
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            Bienvenue {user.fullname}
                        </Typography>
                        <Typography color="text.secondary">
                            {current.school.name}
                        </Typography>
                    </Box>
                    <Chip label="École active" color="primary" />
                </Stack>
            </Paper>

            <Grid container spacing={3}>
                {stats.map((stat, i) => (
                    <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.08 }}
                        >
                            <Card
                                variant="outlined"
                                sx={(theme) => ({
                                    height: "100%",
                                    bgcolor: alpha(theme.palette.text.primary, 0.025),
                                    borderColor: "divider",
                                })}
                            >
                                <CardContent>
                                    <Stack
                                        direction="row"
                                        spacing={1.5}
                                        sx={{ alignItems: "center" }}
                                    >
                                        {stat.icon}
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                {stat.label}
                                            </Typography>
                                            <Typography variant="h6">
                                                {stat.value}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                ))}
            </Grid>

            {isStaff && summaryError && (
                <Alert severity="error" sx={{ mt: 3 }}>
                    {summaryError}
                </Alert>
            )}

            {isStaff && summary && (
                <>
                    {(summary.payments_pending_count > 0 || summary.attendance_pending_justifications > 0) && (
                        <Paper
                            sx={(theme) => ({
                                mt: 3,
                                p: { xs: 3, md: 4 },
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: alpha(theme.palette.text.primary, 0.03),
                            })}
                        >
                            <Typography variant="h6" gutterBottom>
                                Actions requises
                            </Typography>
                            <Stack spacing={1.5}>
                                {summary.payments_pending_count > 0 && (
                                    <Alert
                                        severity="warning"
                                        action={
                                            <Button component={RouterLink} to="/dashboard/payments" color="inherit" size="small">
                                                Voir
                                            </Button>
                                        }
                                    >
                                        {summary.payments_pending_count} paiement(s) en attente de confirmation
                                        {" "}({Number(summary.payments_pending_amount).toLocaleString()} FCFA)
                                    </Alert>
                                )}
                                {summary.attendance_pending_justifications > 0 && (
                                    <Alert
                                        severity="warning"
                                        action={
                                            <Button component={RouterLink} to="/dashboard/attendance-justifications" color="inherit" size="small">
                                                Voir
                                            </Button>
                                        }
                                    >
                                        {summary.attendance_pending_justifications} justification(s) d'absence en attente
                                    </Alert>
                                )}
                            </Stack>
                        </Paper>
                    )}

                    <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                        Aperçu de l'école
                    </Typography>
                    <Grid container spacing={3}>
                        {[
                            { icon: <School2Icon color="primary" />, label: "Élèves", value: summary.students_count },
                            { icon: <PersonIcon color="primary" />, label: "Professeurs", value: summary.teachers_count },
                            { icon: <MenuBookIcon color="primary" />, label: "Classes", value: summary.classes_count },
                            { icon: <EventBusyIcon color="primary" />, label: "Absences aujourd'hui", value: summary.attendance_today_absent },
                            {
                                icon: <PaymentsIcon color="primary" />,
                                label: "Paiements confirmés",
                                value: `${Number(summary.payments_confirmed_amount).toLocaleString()} FCFA`,
                            },
                        ].map((stat, i) => (
                            <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 4 }}>
                                <motion.div
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: i * 0.06 }}
                                >
                                    <Card
                                        variant="outlined"
                                        sx={(theme) => ({
                                            height: "100%",
                                            bgcolor: alpha(theme.palette.text.primary, 0.025),
                                            borderColor: "divider",
                                        })}
                                    >
                                        <CardContent>
                                            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                                                {stat.icon}
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {stat.label}
                                                    </Typography>
                                                    <Typography variant="h6">{stat.value}</Typography>
                                                </Box>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {quickActions.length > 0 && (
                <Paper
                    sx={(theme) => ({
                        mt: 3,
                        p: { xs: 3, md: 4 },
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: alpha(theme.palette.text.primary, 0.03),
                    })}
                >
                    <Typography variant="h6" gutterBottom>
                        Actions rapides
                    </Typography>
                    <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5 }}>
                        {quickActions.map((action) => (
                            <Button
                                key={action.label}
                                component={RouterLink}
                                to={action.to}
                                variant="outlined"
                                startIcon={action.icon}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </Stack>
                </Paper>
            )}
        </Box>
    );
}
