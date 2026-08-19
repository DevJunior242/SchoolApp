import { useEffect, useState } from "react";
import {
  Alert,
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
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "motion/react";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import api from "../api/axios.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import EnrollmentRequestModal from "../components/EnrollmentRequestModal.jsx";
import ChatbotWidget from "../components/ChatbotWidget.jsx";

const heroStats = [
  { value: "150+", label: "Écoles partenaires" },
  { value: "40k+", label: "Élèves suivis" },
  { value: "13", label: "Régions couvertes" },
];

const trustCities = [
  "Ouagadougou",
  "Bobo-Dioulasso",
  "Koudougou",
  "Ouahigouya",
  "Banfora",
];

const features = [
  {
    icon: "🏫",
    title: "Gestion des établissements",
    description:
      "Inscriptions, classes, emplois du temps et effectifs centralisés, du maternel au secondaire.",
  },
  {
    icon: "📊",
    title: "Suivi pédagogique",
    description:
      "Notes, présences et bulletins mis à jour en temps réel, consultables par les parents.",
  },
  {
    icon: "💬",
    title: "Communication aux familles",
    description:
      "SMS et WhatsApp pour joindre les parents, sans dépendre d'une application lourde.",
  },
  {
    icon: "💳",
    title: "Paiement de la scolarité",
    description:
      "Orange Money, Moov Money et espèces suivies, avec reçus automatiques.",
  },
  {
    icon: "📡",
    title: "Mode faible connexion",
    description:
      "L'essentiel fonctionne hors-ligne et se synchronise dès que la connexion revient.",
  },
  {
    icon: "📈",
    title: "Rapports pour l'État",
    description:
      "Statistiques consolidées, exportables, conformes aux exigences du Ministère.",
  },
];

const adaptations = [
  {
    icon: "📱",
    title: "Mobile Money natif",
    description:
      "Paiements et frais de scolarité réglés en Orange Money ou Moov Money, sans compte bancaire requis.",
  },
  {
    icon: "🗣️",
    title: "Langues nationales",
    description:
      "Interface et support en français, avec des ressources en mooré et en dioula pour les familles.",
  },
  {
    icon: "📶",
    title: "Données allégées",
    description:
      "Conçu pour les connexions instables des zones rurales comme urbaines, faible consommation de data.",
  },
];

const aboutStats = [
  { value: "150+", label: "Écoles" },
  { value: "2 400+", label: "Enseignants" },
  { value: "13", label: "Régions" },
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

function SectionEyebrow({ children }) {
  return (
    <Typography
      sx={{
        color: "primary.main",
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        mb: 1.5,
      }}
    >
      {children}
    </Typography>
  );
}

function IconTile({ children, size = 48, radius = 12 }) {
  return (
    <Box
      sx={(theme) => ({
        width: size,
        height: size,
        borderRadius: `${radius}px`,
        bgcolor: alpha(theme.palette.primary.main, 0.15),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.45,
        mb: 2.5,
      })}
    >
      {children}
    </Box>
  );
}

function MarketingHome() {
  const [dashTab, setDashTab] = useState("dashboard");
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoForm, setDemoForm] = useState({
    school_name: "",
    email: "",
    phone: "",
    description: "",
    company: "", // honeypot : laissé vide par un humain
  });
  const [demoError, setDemoError] = useState(null);
  const [demoSubmitting, setDemoSubmitting] = useState(false);

  function handleDemoChange(field) {
    return (e) => setDemoForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleDemoSubmit(e) {
    e.preventDefault();
    setDemoError(null);

    if (!demoForm.email.trim() && !demoForm.phone.trim()) {
      setDemoError("Indiquez au moins un email ou un numéro de téléphone pour être recontacté.");
      return;
    }

    setDemoSubmitting(true);
    try {
      await api.post("/demo-requests", demoForm);
      setDemoSubmitted(true);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setDemoError(messages ? Object.values(messages).flat().join(" ") : "Impossible d'envoyer la demande.");
    } finally {
      setDemoSubmitting(false);
    }
  }

  return (
    <Box sx={{ bgcolor: "background.default", color: "text.primary" }}>
      {/* HERO */}
      <Box
        sx={(theme) => ({
          position: "relative",
          overflow: "hidden",
          py: { xs: 8, md: 12 },
          background:
            theme.palette.mode === "dark"
              ? `radial-gradient(circle at top left, ${alpha(theme.palette.primary.main, 0.28)}, transparent 35%), linear-gradient(135deg, #0F0D0C 0%, #171310 100%)`
              : `radial-gradient(circle at top left, ${alpha(theme.palette.primary.main, 0.16)}, transparent 35%), linear-gradient(135deg, #F7F5F0 0%, #EFEAE0 100%)`,
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
                <Box
                  sx={(theme) => ({
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.14),
                    color: "primary.main",
                    fontWeight: 700,
                    fontSize: 13,
                    px: 2,
                    py: 1,
                    borderRadius: 999,
                    mb: 3,
                    letterSpacing: 0.4,
                  })}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                    }}
                  />
                  Intelligence · Innovation — pour les écoles du Burkina Faso
                </Box>

                <Typography
                  variant="h2"
                  sx={{
                    fontSize: {
                      xs: "2.1rem",
                      md: "3.4rem",
                    },
                    lineHeight: 1.1,
                    mb: 2,
                  }}
                >
                  La gestion scolaire,{" "}
                  <Box component="span" sx={{ color: "primary.main" }}>
                    intelligente
                  </Box>{" "}
                  et pensée pour le terrain
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{
                    mb: 4,
                    maxWidth: 520,
                    fontWeight: 400,
                  }}
                >
                  Écoles, enseignants, parents et élèves réunis dans un seul
                  espace — conçu pour fonctionner avec une connexion limitée,
                  en Mobile Money, et dans les langues nationales.
                </Typography>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ mb: 4 }}
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
                    href="#features"
                    variant="outlined"
                    size="large"
                    sx={{
                      color: "text.primary",
                      borderColor: "divider",
                    }}
                  >
                    Voir les fonctionnalités
                  </Button>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  {heroStats.map((item) => (
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
                <Box sx={{ position: "relative" }}>
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
                      <Chip
                        label="Tableau de bord"
                        color={dashTab === "dashboard" ? "primary" : "default"}
                        variant={dashTab === "dashboard" ? "filled" : "outlined"}
                        onClick={() => setDashTab("dashboard")}
                      />
                      <Chip
                        label="Gestion scolaire"
                        color={dashTab === "gestion" ? "primary" : "default"}
                        variant={dashTab === "gestion" ? "filled" : "outlined"}
                        onClick={() => setDashTab("gestion")}
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
                      {dashTab === "dashboard" ? (
                        <>
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
                                Lycée Notre-Dame de Bobo
                              </Typography>
                            </Box>
                            <Chip label="Actif" color="primary" size="small" />
                          </Stack>
                          <Grid container spacing={1.5} sx={{ mb: 2 }}>
                            {[
                              { value: "31", label: "Cours" },
                              { value: "742", label: "Élèves" },
                              { value: "28", label: "Enseignants" },
                            ].map((stat) => (
                              <Grid key={stat.label} size={{ xs: 4 }}>
                                <Paper
                                  variant="outlined"
                                  sx={(theme) => ({
                                    p: 1.2,
                                    textAlign: "center",
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                  })}
                                >
                                  <Typography variant="h6" color="primary.main">
                                    {stat.value}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {stat.label}
                                  </Typography>
                                </Paper>
                              </Grid>
                            ))}
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
                                  width: "72%",
                                  height: "100%",
                                  bgcolor: "primary.main",
                                }}
                              />
                            </Box>
                          </Box>
                        </>
                      ) : (
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1.5 }}
                          >
                            Paiements de scolarité — ce mois
                          </Typography>
                          <Stack spacing={1}>
                            {[
                              { label: "Orange Money", value: "1 240 000 FCFA" },
                              { label: "Moov Money", value: "860 000 FCFA" },
                              { label: "Espèces suivies", value: "410 000 FCFA" },
                            ].map((row) => (
                              <Stack
                                key={row.label}
                                direction="row"
                                sx={(theme) => ({
                                  justifyContent: "space-between",
                                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                                  borderRadius: 2,
                                  px: 1.5,
                                  py: 1,
                                })}
                              >
                                <Typography variant="body2">
                                  {row.label}
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                  {row.value}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                  <Chip
                    label="📶 Fonctionne hors-ligne — synchronisation auto"
                    sx={{
                      position: "absolute",
                      bottom: -18,
                      left: -12,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      fontWeight: 700,
                      boxShadow: "0 14px 30px -10px rgba(0,0,0,0.5)",
                    }}
                  />
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* TRUST BAR */}
      <Box
        sx={{
          py: 4.5,
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg">
          <Typography
            sx={{
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "text.secondary",
              letterSpacing: 1,
              textTransform: "uppercase",
              mb: 2.5,
            }}
          >
            Déjà utilisé par des établissements à travers le pays
          </Typography>
          <Stack
            direction="row"
            spacing={{ xs: 3, md: 6 }}
            sx={{ justifyContent: "center", flexWrap: "wrap", rowGap: 1.5 }}
          >
            {trustCities.map((city) => (
              <Typography key={city} fontWeight={600} color="text.secondary">
                {city}
              </Typography>
            ))}
          </Stack>
        </Container>
      </Box>

      <SchoolsSlider />

      {/* FEATURES */}
      <Container
        id="features"
        maxWidth="lg"
        sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 80 }}
      >
        <Box sx={{ textAlign: "center", maxWidth: 700, mx: "auto", mb: 6 }}>
          <SectionEyebrow>Fonctionnalités</SectionEyebrow>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
            Tout ce qu'il faut pour piloter un établissement
          </Typography>
          <Typography color="text.secondary">
            De l'inscription au bulletin, en passant par les paiements et la
            communication avec les familles.
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {features.map((feature, i) => (
            <Grid key={feature.title} size={{ xs: 12, sm: 6, md: 4 }}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
              >
                <Paper
                  elevation={0}
                  sx={(theme) => ({
                    p: 4,
                    height: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: alpha(theme.palette.text.primary, 0.02),
                  })}
                >
                  <IconTile>{feature.icon}</IconTile>
                  <Typography variant="h6" sx={{ mb: 1 }}>
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

      {/* NOTRE APPROCHE */}
      <Container maxWidth="lg" sx={{ mb: 5 }}>
        <Box
          id="approche"
          sx={(theme) => ({
            py: { xs: 6, md: 10 },
            px: { xs: 3, md: 8 },
            borderRadius: 6,
            bgcolor: alpha(theme.palette.text.primary, 0.02),
            scrollMarginTop: 80,
          })}
        >
          <Box sx={{ textAlign: "center", maxWidth: 700, mx: "auto", mb: 6 }}>
            <SectionEyebrow>Notre approche</SectionEyebrow>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
              Pensé pour les réalités du terrain
            </Typography>
            <Typography color="text.secondary">
              Pas une adaptation d'un outil étranger — une plateforme conçue
              dès le départ pour le Burkina Faso.
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {adaptations.map((item) => (
              <Grid key={item.title} size={{ xs: 12, md: 4 }}>
                <Box sx={{ textAlign: "center", px: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <IconTile size={64} radius={16}>{item.icon}</IconTile>
                  </Box>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      {/* À PROPOS + TÉMOIGNAGE */}
      <Container id="apropos" maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, scrollMarginTop: 80 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionEyebrow>À propos</SectionEyebrow>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
              Une confiance qui se construit établissement par établissement
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              EduAfrique accompagne des écoles maternelles, primaires et
              secondaires à Ouagadougou, Bobo-Dioulasso, Koudougou et
              au-delà, avec un support en français et un accompagnement de
              proximité.
            </Typography>
            <Grid container spacing={2}>
              {aboutStats.map((stat) => (
                <Grid key={stat.label} size={{ xs: 4 }}>
                  <Typography variant="h5" fontWeight={700}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={(theme) => ({
                p: { xs: 3, md: 5 },
                borderRadius: 4,
                border: "1px solid",
                borderColor: alpha(theme.palette.primary.main, 0.3),
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(theme.palette.text.primary, 0.03)})`,
              })}
            >
              <Typography sx={{ fontSize: 40, lineHeight: 1, color: "primary.main", mb: 1 }}>
                "
              </Typography>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 500 }}>
                Témoignage à venir — à remplacer par le retour d'un
                établissement qui utilise réellement la plateforme.
              </Typography>
              <Typography fontWeight={700}>
                [Nom, fonction]
              </Typography>
              <Typography variant="body2" color="text.secondary">
                [Établissement — Ville]
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* CONTACT */}
      <Container maxWidth="lg" sx={{ mb: 6 }}>
        <Box
          id="contact"
          sx={(theme) => ({
            py: { xs: 6, md: 9 },
            px: { xs: 3, md: 8 },
            borderRadius: 6,
            bgcolor: alpha(theme.palette.text.primary, 0.02),
            scrollMarginTop: 80,
          })}
        >
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionEyebrow>Contact</SectionEyebrow>
              <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                Discutons de votre établissement
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Nos équipes vous accompagnent pour la mise en place, la
                formation du personnel et le suivi.
              </Typography>
              <Stack spacing={2}>
                <Typography color="text.secondary">
                  📍 Ouagadougou, Burkina Faso
                </Typography>
                <Typography color="text.secondary">
                  📞 56 56 56 70 / 58 11 68 11
                </Typography>
                <Typography color="text.secondary">
                  ✉️ contact@intellino.tech
                </Typography>
                <Typography color="text.secondary">
                  🌐 www.intellino.tech · Assistance en français, mooré et dioula
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant="outlined"
                sx={(theme) => ({
                  p: { xs: 3, md: 4 },
                  bgcolor: alpha(theme.palette.text.primary, 0.03),
                })}
              >
                {demoSubmitted ? (
                  <Box sx={{ textAlign: "center", py: 5 }}>
                    <Typography sx={{ fontSize: 40, mb: 2 }}>✅</Typography>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Demande envoyée
                    </Typography>
                    <Typography color="text.secondary">
                      Notre équipe vous contactera sous 24h.
                    </Typography>
                  </Box>
                ) : (
                  <Box component="form" onSubmit={handleDemoSubmit}>
                    <Stack spacing={2.5}>
                      {demoError && <Alert severity="error">{demoError}</Alert>}
                      <TextField
                        label="Nom de l'établissement (optionnel)"
                        placeholder="Ex : Lycée Notre-Dame de Bobo"
                        value={demoForm.school_name}
                        onChange={handleDemoChange("school_name")}
                        fullWidth
                      />
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                          label="Téléphone"
                          placeholder="+226 70 00 00 00"
                          value={demoForm.phone}
                          onChange={handleDemoChange("phone")}
                          fullWidth
                        />
                        <TextField
                          label="Email"
                          type="email"
                          placeholder="vous@ecole.bf"
                          value={demoForm.email}
                          onChange={handleDemoChange("email")}
                          fullWidth
                        />
                      </Stack>
                      <TextField
                        label="Votre besoin"
                        placeholder="Décrivez votre établissement et ce que vous cherchez..."
                        value={demoForm.description}
                        onChange={handleDemoChange("description")}
                        multiline
                        minRows={3}
                        required
                        fullWidth
                      />
                      {/* Honeypot anti-bot : invisible et non atteignable pour un humain */}
                      <Box sx={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
                        <TextField
                          label="Entreprise"
                          name="company"
                          tabIndex={-1}
                          autoComplete="off"
                          value={demoForm.company}
                          onChange={handleDemoChange("company")}
                        />
                      </Box>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        size="large"
                        disabled={demoSubmitting}
                      >
                        {demoSubmitting ? "Envoi..." : "Demander une démo"}
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* CTA FINAL */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Paper
            elevation={0}
            sx={(theme) => ({
              p: { xs: 3, md: 4 },
              border: "1px solid",
              borderColor: "divider",
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            })}
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

      <ChatbotWidget />
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
