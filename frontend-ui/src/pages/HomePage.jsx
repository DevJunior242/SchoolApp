import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { motion } from "motion/react";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import SchoolIcon from "@mui/icons-material/School";
import GroupsIcon from "@mui/icons-material/Groups";
import BarChartIcon from "@mui/icons-material/BarChart";
import PublicIcon from "@mui/icons-material/Public";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import DashboardCustomizeOutlinedIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import { useApiGet } from "../hooks/useApiGet.js";
import EnrollmentRequestModal from "../components/EnrollmentRequestModal.jsx";

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
  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.slice(1);
    const timeout = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  return <MarketingHome />;
}

function MarketingHome() {
  return (
    <Box sx={{ bgcolor: "background.default", color: "text.primary" }}>
      <Box
        sx={(theme) => ({
          position: "relative",
          overflow: "hidden",
          py: { xs: 8, md: 12 },
          background:
            theme.palette.mode === "dark"
              ? "radial-gradient(circle at top left, rgba(201,162,39,0.22), transparent 35%), linear-gradient(135deg, #050505 0%, #111111 100%)"
              : "radial-gradient(circle at top left, rgba(201,162,39,0.16), transparent 35%), linear-gradient(135deg, #F7F5F0 0%, #EFEAE0 100%)",
        })}
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
                  <Chip label="Plateforme éducative" color="primary" />
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
                  La plateforme qui structure l’éducation moderne
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
                  Centralisez vos écoles, classes, élèves, enseignants et rôles
                  dans un espace unique, fiable et pensé pour les établissements
                  africains.
                </Typography>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ mb: 3 }}
                >
                  <Button
                    component={RouterLink}
                    to="/create-school"
                    variant="contained"
                    color="primary"
                    size="large"
                  >
                    Créer mon école
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

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  {stats.map((item) => (
                    <Paper
                      key={item.label}
                      variant="outlined"
                      sx={(theme) => ({
                        px: 2,
                        py: 1.2,
                        minWidth: 140,
                        bgcolor: alpha(theme.palette.text.primary, 0.03),
                      })}
                    >
                      <Typography variant="h6" color="primary.main">
                        {item.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
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
                  sx={(theme) => ({
                    p: { xs: 2.5, md: 3 },
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: alpha(theme.palette.text.primary, 0.03),
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
                  })}
                >
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip label="Tableau de bord" color="primary" />
                    <Chip label="Gestion scolaire" variant="outlined" />
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
                        <Typography variant="body2" color="text.secondary">
                          Établissement
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          Lycée Moderne de Dakar
                        </Typography>
                      </Box>
                      <Chip label="Actif" color="primary" size="small" />
                    </Stack>
                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                      <Grid size={{ xs: 4 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.2,
                            textAlign: "center",
                            bgcolor: "rgba(201,162,39,0.08)",
                          }}
                        >
                          <Typography variant="h6" color="primary.main">
                            24
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
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
                            bgcolor: "rgba(201,162,39,0.08)",
                          }}
                        >
                          <Typography variant="h6" color="primary.main">
                            318
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
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
                            bgcolor: "rgba(201,162,39,0.08)",
                          }}
                        >
                          <Typography variant="h6" color="primary.main">
                            12
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
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
                        sx={(theme) => ({
                          height: 8,
                          borderRadius: 999,
                          bgcolor: alpha(theme.palette.text.primary, 0.08),
                          overflow: "hidden",
                        })}
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

      <Container
        id="features"
        maxWidth="lg"
        sx={{ py: { xs: 6, md: 8 }, scrollMarginTop: 80 }}
      >
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
          Pourquoi cette plateforme
        </Typography>
        <Grid container spacing={3}>
          {features.map((feature, i) => (
            <Grid key={feature.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
              >
                <Paper
                  elevation={0}
                  sx={(theme) => ({
                    p: 3,
                    height: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: alpha(theme.palette.text.primary, 0.02),
                  })}
                >
                  {feature.icon}
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      <SchoolsSlider />

      <Box
        id="etablissements"
        sx={(theme) => ({
          py: { xs: 6, md: 8 },
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: alpha(theme.palette.text.primary, 0.02),
          scrollMarginTop: 80,
        })}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                Pensée pour les établissements qui veulent aller plus loin
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
                Que vous soyez une école, un groupe scolaire ou une direction
                régionale, la plateforme vous aide à centraliser l’information,
                sécuriser les rôles et gagner en fluidité au quotidien.
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
                      sx={(theme) => ({
                        p: 2.2,
                        display: "flex",
                        gap: 1.5,
                        alignItems: "flex-start",
                        bgcolor: alpha(theme.palette.text.primary, 0.03),
                      })}
                    >
                      {item.icon}
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {item.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
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
            <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
              Prêt à moderniser votre établissement ?
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Lancez votre espace en quelques minutes et donnez à votre école
              une vraie visibilité numérique.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                component={RouterLink}
                to="/create-school"
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

function SchoolsSlider() {
  const { data: schools } = useApiGet("/schools");
  const [selectedSchool, setSelectedSchool] = useState(null);

  if (!schools || schools.length === 0) return null;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        Nos écoles
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Des établissements déjà présents sur EduAfrique. Envoyez une demande de pré-inscription en
        quelques clics.
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          pb: 1,
          scrollSnapType: "x mandatory",
          "& > *": { scrollSnapAlign: "start", flexShrink: 0 },
        }}
      >
        {schools.map((school, i) => (
          <motion.div
            key={school.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card
              variant="outlined"
              sx={(theme) => ({
                width: 260,
                bgcolor: alpha(theme.palette.text.primary, 0.03),
              })}
            >
              <CardContent>
                <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, alignItems: "center" }}>
                  <Avatar src={school.logo_url ?? undefined} variant="rounded">
                    {school.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap>
                      {school.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {[school.city, school.country?.name].filter(Boolean).join(", ")}
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => setSelectedSchool(school)}
                >
                  Envoyer une demande
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Box>

      <EnrollmentRequestModal
        open={Boolean(selectedSchool)}
        school={selectedSchool}
        onClose={() => setSelectedSchool(null)}
      />
    </Container>
  );
}
