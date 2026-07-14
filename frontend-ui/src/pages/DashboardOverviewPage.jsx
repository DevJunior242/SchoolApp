import {
    Alert,
    Box,
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
import { Link as RouterLink } from "react-router-dom";
import PublicIcon from "@mui/icons-material/Public";
import Diversity3Icon from "@mui/icons-material/Diversity3";
import BadgeIcon from "@mui/icons-material/Badge";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import SchoolIcon from "@mui/icons-material/School";
import { useAuth } from "../context/AuthContext.jsx";
import { useSchools } from "../hooks/useSchools.js";

export default function DashboardOverviewPage() {
    const { user } = useAuth();
    const { schoolUsers, loading, error } = useSchools();

    if (loading)
        return <Typography color="text.secondary">Chargement...</Typography>;

    if (error) {
        return (
            <Container maxWidth="sm">
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    const current = schoolUsers.find(
        (su) => su.school.id === user.current_school_id,
    );

    if (!current) {
        return (
            <Container maxWidth="sm">
                <Paper
                    sx={{
                        p: 4,
                        textAlign: "center",
                        bgcolor: "rgba(255,255,255,0.03)",
                        border: "1px solid",
                        borderColor: "divider",
                    }}
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
                sx={{
                    p: { xs: 3, md: 4 },
                    mb: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "rgba(255,255,255,0.03)",
                }}
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
                                sx={{
                                    height: "100%",
                                    bgcolor: "rgba(255,255,255,0.025)",
                                    borderColor: "divider",
                                }}
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

            <Paper
                sx={{
                    mt: 3,
                    p: { xs: 3, md: 4 },
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "rgba(255,255,255,0.03)",
                }}
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
                        <Typography variant="h6" gutterBottom>
                            Gestion scolaire centralisée
                        </Typography>
                        <Typography color="text.secondary">
                            Les écoles, les classes, les membres et les rôles
                            sont maintenant regroupés dans un espace plus
                            structuré.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Chip
                            icon={<SchoolIcon />}
                            label="Classes"
                            color="primary"
                        />
                        <Chip label="Élèves" variant="outlined" />
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}
