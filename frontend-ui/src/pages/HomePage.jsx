import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Container,
    Grid,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { motion } from "motion/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import SchoolIcon from "@mui/icons-material/School";
import GroupsIcon from "@mui/icons-material/Groups";
import BarChartIcon from "@mui/icons-material/BarChart";
import PublicIcon from "@mui/icons-material/Public";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import DashboardCustomizeOutlinedIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSchools } from "../hooks/useSchools.js";

const features = [
    {
        icon: <SchoolIcon fontSize="large" color="primary" />,
        title: "Écoles et classes",
        description:
            "Organisez vos établissements, niveaux et classes dans un espace unique et clair.",
    },
    {
        icon: <GroupsIcon fontSize="large" color="primary" />,
        title: "Rôles multi-établissements",
        description:
            "Un seul compte pour gérer plusieurs écoles, enseignants, élèves et responsabilités.",
    },
    {
        icon: <BarChartIcon fontSize="large" color="primary" />,
        title: "Suivi pédagogique",
        description:
            "Suivez les performances, les absences et les résultats sans perdre de temps.",
    },
    {
        icon: <PublicIcon fontSize="large" color="primary" />,
        title: "Pensé pour l’Afrique",
        description:
            "Une solution robuste, simple à utiliser et adaptée aux réalités de terrain.",
    },
];

const audience = [
    {
        title: "Établissements",
        text: "Pour les écoles qui veulent structurer leur quotidien avec discipline et visibilité.",
        icon: <DashboardCustomizeOutlinedIcon color="primary" />,
    },
    {
        title: "Directions",
        text: "Pour piloter plusieurs établissements, cycles et équipes avec une vue globale.",
        icon: <ShieldOutlinedIcon color="primary" />,
    },
    {
        title: "Enseignants",
        text: "Pour collaborer plus facilement autour des classes, des élèves et des suivis.",
        icon: <AutoAwesomeOutlinedIcon color="primary" />,
    },
];

const stats = [
    { label: "Écoles gérées", value: "120+" },
    { label: "Classes suivies", value: "800+" },
    { label: "Utilisateurs actifs", value: "5k+" },
];

export default function HomePage() {
    const { user } = useAuth();
    return user ? <AuthenticatedHome /> : <MarketingHome />;
}

function MarketingHome() {
    return (
        <Box sx={{ bgcolor: "background.default", color: "text.primary" }}>
            <Box
                sx={{
                    position: "relative",
                    overflow: "hidden",
                    py: { xs: 8, md: 12 },
                    background:
                        "radial-gradient(circle at top left, rgba(201,162,39,0.22), transparent 35%), linear-gradient(135deg, #050505 0%, #111111 100%)",
                }}
            >
                <Container maxWidth="lg">
                    <Grid container spacing={4} alignItems="center">
                        <Grid size={{ xs: 12, md: 7 }}>
                            <motion.div
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{ mb: 2, alignItems: "center" }}
                                >
                                    <Chip
                                        label="Plateforme éducative"
                                        color="primary"
                                    />
                                    <Chip
                                        label="Noir & Or"
                                        variant="outlined"
                                    />
                                </Stack>

                                <Typography
                                    variant="h2"
                                    sx={{
                                        fontSize: {
                                            xs: "2.1rem",
                                            md: "3.4rem",
                                        },
                                        lineHeight: 1.05,
                                        mb: 2,
                                    }}
                                >
                                    La plateforme qui structure l’éducation
                                    moderne
                                </Typography>
                                <Typography
                                    variant="h6"
                                    color="text.secondary"
                                    sx={{
                                        mb: 4,
                                        maxWidth: 650,
                                        fontWeight: 400,
                                    }}
                                >
                                    Centralisez vos écoles, classes, élèves,
                                    enseignants et rôles dans un espace unique,
                                    fiable et pensé pour les établissements
                                    africains.
                                </Typography>

                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={2}
                                    sx={{ mb: 3 }}
                                >
                                    <Button
                                        component={RouterLink}
                                        to="/register"
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                    >
                                        Créer mon espace
                                    </Button>
                                    <Button
                                        component={RouterLink}
                                        to="/login"
                                        variant="outlined"
                                        size="large"
                                        sx={{
                                            color: "text.primary",
                                            borderColor: "divider",
                                        }}
                                    >
                                        Se connecter
                                    </Button>
                                </Stack>

                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={2}
                                >
                                    {stats.map((item) => (
                                        <Paper
                                            key={item.label}
                                            variant="outlined"
                                            sx={{
                                                px: 2,
                                                py: 1.2,
                                                minWidth: 140,
                                                bgcolor:
                                                    "rgba(255,255,255,0.03)",
                                            }}
                                        >
                                            <Typography
                                                variant="h6"
                                                color="primary.main"
                                            >
                                                {item.value}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                {item.label}
                                            </Typography>
                                        </Paper>
                                    ))}
                                </Stack>
                            </motion.div>
                        </Grid>

                        <Grid size={{ xs: 12, md: 5 }}>
                            <motion.div
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: { xs: 2.5, md: 3 },
                                        border: "1px solid",
                                        borderColor: "divider",
                                        bgcolor: "rgba(255,255,255,0.03)",
                                        boxShadow:
                                            "0 20px 60px rgba(0, 0, 0, 0.35)",
                                    }}
                                >
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{ mb: 2 }}
                                    >
                                        <Chip
                                            label="Tableau de bord"
                                            color="primary"
                                        />
                                        <Chip
                                            label="Gestion scolaire"
                                            variant="outlined"
                                        />
                                    </Stack>
                                    <Box
                                        sx={{
                                            border: "1px solid",
                                            borderColor: "divider",
                                            borderRadius: 3,
                                            p: 2,
                                            bgcolor: "background.paper",
                                        }}
                                    >
                                        <Stack
                                            direction="row"
                                            sx={{
                                                justifyContent: "space-between",
                                                mb: 2,
                                            }}
                                        >
                                            <Box>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    Établissement
                                                </Typography>
                                                <Typography
                                                    variant="subtitle1"
                                                    fontWeight={700}
                                                >
                                                    Lycée Moderne de Dakar
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label="Actif"
                                                color="primary"
                                                size="small"
                                            />
                                        </Stack>
                                        <Grid
                                            container
                                            spacing={1.5}
                                            sx={{ mb: 2 }}
                                        >
                                            <Grid size={{ xs: 4 }}>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1.2,
                                                        textAlign: "center",
                                                        bgcolor:
                                                            "rgba(201,162,39,0.08)",
                                                    }}
                                                >
                                                    <Typography
                                                        variant="h6"
                                                        color="primary.main"
                                                    >
                                                        24
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Classes
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 4 }}>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1.2,
                                                        textAlign: "center",
                                                        bgcolor:
                                                            "rgba(201,162,39,0.08)",
                                                    }}
                                                >
                                                    <Typography
                                                        variant="h6"
                                                        color="primary.main"
                                                    >
                                                        318
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Élèves
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 4 }}>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1.2,
                                                        textAlign: "center",
                                                        bgcolor:
                                                            "rgba(201,162,39,0.08)",
                                                    }}
                                                >
                                                    <Typography
                                                        variant="h6"
                                                        color="primary.main"
                                                    >
                                                        12
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Enseignants
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                        </Grid>
                                        <Box
                                            sx={{
                                                borderTop: "1px solid",
                                                borderColor: "divider",
                                                pt: 2,
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 1 }}
                                            >
                                                Progression du trimestre
                                            </Typography>
                                            <Box
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 999,
                                                    bgcolor:
                                                        "rgba(255,255,255,0.08)",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: "78%",
                                                        height: "100%",
                                                        bgcolor: "primary.main",
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Paper>
                            </motion.div>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
                <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
                    Pourquoi cette plateforme
                </Typography>
                <Grid container spacing={3}>
                    {features.map((feature, i) => (
                        <Grid
                            key={feature.title}
                            size={{ xs: 12, sm: 6, md: 3 }}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.08 }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        height: "100%",
                                        border: "1px solid",
                                        borderColor: "divider",
                                        bgcolor: "rgba(255,255,255,0.02)",
                                    }}
                                >
                                    {feature.icon}
                                    <Typography
                                        variant="h6"
                                        sx={{ mt: 2, mb: 1 }}
                                    >
                                        {feature.title}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        {feature.description}
                                    </Typography>
                                </Paper>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            <Box
                sx={{
                    py: { xs: 6, md: 8 },
                    borderTop: "1px solid",
                    borderColor: "divider",
                    bgcolor: "rgba(255,255,255,0.02)",
                }}
            >
                <Container maxWidth="lg">
                    <Grid container spacing={4} alignItems="center">
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography
                                variant="h4"
                                sx={{ mb: 2, fontWeight: 700 }}
                            >
                                Pensée pour les établissements qui veulent aller
                                plus loin
                            </Typography>
                            <Typography
                                color="text.secondary"
                                sx={{ maxWidth: 560 }}
                            >
                                Que vous soyez une école, un groupe scolaire ou
                                une direction régionale, la plateforme vous aide
                                à centraliser l’information, sécuriser les rôles
                                et gagner en fluidité au quotidien.
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Stack spacing={2}>
                                {audience.map((item, index) => (
                                    <motion.div
                                        key={item.title}
                                        initial={{ opacity: 0, x: 12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{
                                            duration: 0.3,
                                            delay: index * 0.05,
                                        }}
                                    >
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2.2,
                                                display: "flex",
                                                gap: 1.5,
                                                alignItems: "flex-start",
                                                bgcolor:
                                                    "rgba(255,255,255,0.03)",
                                            }}
                                        >
                                            {item.icon}
                                            <Box>
                                                <Typography
                                                    variant="subtitle1"
                                                    fontWeight={700}
                                                >
                                                    {item.title}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    {item.text}
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    </motion.div>
                                ))}
                            </Stack>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Box sx={{ py: { xs: 6, md: 8 } }}>
                <Container maxWidth="md">
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 3, md: 4 },
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "rgba(201,162,39,0.08)",
                        }}
                    >
                        <Typography
                            variant="h5"
                            sx={{ mb: 1, fontWeight: 700 }}
                        >
                            Prêt à moderniser votre établissement ?
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 3 }}>
                            Lancez votre espace en quelques minutes et donnez à
                            votre école une vraie visibilité numérique.
                        </Typography>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                        >
                            <Button
                                component={RouterLink}
                                to="/register"
                                variant="contained"
                                color="primary"
                                size="large"
                            >
                                Commencer maintenant
                            </Button>
                            <Button
                                component={RouterLink}
                                to="/login"
                                variant="outlined"
                                size="large"
                                sx={{ borderColor: "divider" }}
                            >
                                Voir mon compte
                            </Button>
                        </Stack>
                    </Paper>
                </Container>
            </Box>
        </Box>
    );
}

function AuthenticatedHome() {
    const { user } = useAuth();
    const { schoolUsers, createSchool, switchSchool } = useSchools();
    const navigate = useNavigate();
    const [countries, setCountries] = useState([]);
    const [form, setForm] = useState({ name: "", country_id: "" });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        api.get("/countries").then((response) => setCountries(response.data));
    }, []);

    async function handleCreateSchool(e) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await createSchool(form);
            setForm({ name: "", country_id: "" });
        } catch {
            setError("Impossible de créer l'école.");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSwitchAndGo(schoolId) {
        await switchSchool(schoolId);
        navigate("/dashboard");
    }

    return (
        <Box sx={{ py: 6, bgcolor: "background.default" }}>
            <Container maxWidth="md">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Typography variant="h4" gutterBottom>
                        Bienvenue {user.fullname}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 4 }}>
                        {user.current_school
                            ? `École active : ${user.current_school.name}`
                            : "Créez ou rejoignez une école pour commencer."}
                    </Typography>
                </motion.div>

                {schoolUsers.length > 0 && (
                    <Box sx={{ mb: 5 }}>
                        <Typography variant="h6" gutterBottom>
                            Mes écoles
                        </Typography>
                        <Grid container spacing={2}>
                            {schoolUsers.map((su, i) => (
                                <Grid key={su.id} size={{ xs: 12, sm: 6 }}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            duration: 0.25,
                                            delay: i * 0.05,
                                        }}
                                    >
                                        <Card
                                            variant="outlined"
                                            sx={{
                                                bgcolor:
                                                    "rgba(255,255,255,0.03)",
                                            }}
                                        >
                                            <CardActionArea
                                                onClick={() =>
                                                    handleSwitchAndGo(
                                                        su.school.id,
                                                    )
                                                }
                                                sx={{ p: 1 }}
                                            >
                                                <CardContent>
                                                    <Stack
                                                        direction="row"
                                                        sx={{
                                                            justifyContent:
                                                                "space-between",
                                                            alignItems:
                                                                "center",
                                                        }}
                                                    >
                                                        <Box>
                                                            <Typography variant="subtitle1">
                                                                {su.school.name}
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                color="text.secondary"
                                                            >
                                                                {
                                                                    su.school
                                                                        .country
                                                                        ?.name
                                                                }{" "}
                                                                ·{" "}
                                                                {su.role?.name}
                                                            </Typography>
                                                        </Box>
                                                        {user.current_school_id ===
                                                            su.school.id && (
                                                            <Chip
                                                                label="Active"
                                                                color="primary"
                                                                size="small"
                                                            />
                                                        )}
                                                    </Stack>
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>
                                    </motion.div>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                <Paper
                    variant="outlined"
                    sx={{
                        p: 3,
                        maxWidth: 420,
                        bgcolor: "rgba(255,255,255,0.03)",
                        borderColor: "divider",
                    }}
                >
                    <Typography variant="h6" gutterBottom>
                        Créer une école
                    </Typography>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Box
                        component="form"
                        onSubmit={handleCreateSchool}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        <TextField
                            label="Nom de l'école"
                            value={form.name}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                            required
                            fullWidth
                        />
                        <TextField
                            select
                            label="Pays"
                            value={form.country_id}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    country_id: e.target.value,
                                }))
                            }
                            required
                            fullWidth
                        >
                            {countries.map((country) => (
                                <MenuItem key={country.id} value={country.id}>
                                    {country.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting}
                        >
                            {submitting ? "Création..." : "Créer l'école"}
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
