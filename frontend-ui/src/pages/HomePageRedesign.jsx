import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "motion/react";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ChatbotWidget from "../components/ChatbotWidget.jsx";
import EnrollmentRequestModal from "../components/EnrollmentRequestModal.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import dashboardImg from "../assets/characters/mock.webp";
import comptImg from "../assets/characters/compt.webp";

import directionImg from "../assets/characters/direction.webp";
import enseignantImg from "../assets/characters/enseignant.webp";
import parentsImg from "../assets/characters/parents.webp";
import eleveImg from "../assets/characters/eleve.webp";

const modules = [
  {
    icon: GroupsOutlinedIcon,
    title: "Élèves",
    text: "Dossiers, inscriptions et suivi quotidien.",
  },
  {
    icon: CalendarMonthOutlinedIcon,
    title: "Vie scolaire",
    text: "Classes, présences, notes et examens.",
  },
  {
    icon: PaymentsOutlinedIcon,
    title: "Finances",
    text: "Frais, paiements et trésorerie réunis.",
  },
  {
    icon: SendOutlinedIcon,
    title: "Communication",
    text: "Messages et annonces au bon endroit.",
  },
  {
    icon: MenuBookOutlinedIcon,
    title: "Bibliothèque",
    text: "Livres, emprunts et retours simplifiés.",
  },
  {
    icon: AssessmentOutlinedIcon,
    title: "Pilotage",
    text: "Rapports clairs pour décider plus vite.",
  },
];

const audiences = [
  {
    label: "Direction",
    image: directionImg,
    title: "Pilotez l'établissement sans courir après l'information.",
    text: "Une vue d'ensemble sur les effectifs, les finances et les priorités du jour.",
    points: [
      "Tableau de bord en temps réel",
      "Suivi financier centralisé",
      "Décisions appuyées par les données",
    ],
  },
  {
    label: "Enseignants",
    image: enseignantImg,
    title: "Consacrez votre temps aux élèves, pas aux tâches répétitives.",
    text: "Retrouvez vos classes, vos notes et vos contenus pédagogiques dans un espace simple.",
    points: [
      "Saisie des notes rapide",
      "Présences toujours à jour",
      "Cours et ressources accessibles",
    ],
  },
  {
    label: "Parents",
    image: parentsImg,
    title: "Donnez aux familles une information claire et accessible.",
    text: "Les parents suivent la scolarité, les paiements et les messages depuis un même espace.",
    points: ["Notes et bulletins", "Paiements suivis", "Communication directe"],
  },
  {
    label: "Élèves",
    image: eleveImg,
    title: "Les informations importantes restent toujours à portée de main.",
    text: "Emploi du temps, résultats et ressources suivent l'élève partout.",
    points: [
      "Emploi du temps",
      "Résultats scolaires",
      "Ressources pédagogiques",
    ],
  },
];

const aiDemos = [
  {
    role: "Direction",
    accent: "primary.main",
    question: "Que dois-je suivre aujourd'hui ?",
    answer:
      "Les effectifs sont stables. Trois paiements attendent une relance et le taux de présence est de 94 % cette semaine. Je peux vous montrer les priorités, sans parcourir plusieurs écrans.",
    metrics: [
      ["Présence", "94 %"],
      ["À relancer", "03"],
      ["Classes", "18"],
    ],
  },
  {
    role: "Comptabilité",
    accent: "success.main",
    question: "Où en est la trésorerie ?",
    answer:
      "Les recettes du mois progressent de 8,4 %. La caisse reste positive et deux dépenses sont en attente de validation. Voici une lecture synthétique, prête à partager avec la direction.",
    metrics: [
      ["Recettes", "+8,4 %"],
      ["En attente", "02"],
      ["Rapports", "06"],
    ],
  },
  {
    role: "Enseignement",
    accent: "info.main",
    question: "Quelles classes demandent mon attention ?",
    answer:
      "La 5e B présente une baisse de présence cette semaine. Deux notions restent fragiles dans les évaluations récentes. Je peux vous aider à repérer les élèves et préparer votre prochaine séance.",
    metrics: [
      ["Mes classes", "04"],
      ["Présence", "91 %"],
      ["À revoir", "02"],
    ],
  },
  {
    role: "Vie scolaire",
    accent: "warning.main",
    question: "Quelles justifications sont en attente ?",
    answer:
      "Cinq absences attendent une justification, réparties dans trois classes. Les événements à venir sont également regroupés pour faciliter votre organisation de la journée.",
    metrics: [
      ["À traiter", "05"],
      ["Classes", "03"],
      ["Événements", "04"],
    ],
  },
];

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePageRedesign() {
  const [audienceIndex, setAudienceIndex] = useState(0);
  const [aiDemoIndex, setAiDemoIndex] = useState(0);
  const audience = audiences[audienceIndex];
  const aiDemo = aiDemos[aiDemoIndex];

  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.slice(1);
    const timeout = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Box sx={{ overflow: "hidden", bgcolor: "background.default" }}>
      <Box
        component="section"
        sx={(theme) => ({
          position: "relative",
          overflow: "hidden",
          bgcolor: theme.palette.mode === "dark" ? "#080706" : "#f4f1eb",
          borderBottom: "1px solid",
          borderColor: "divider",
          "&::before": {
            content: '""',
            position: "absolute",
            width: { xs: 260, md: 520 },
            height: { xs: 260, md: 520 },
            right: { xs: -140, md: -80 },
            top: { xs: 120, md: -120 },
            borderRadius: "50%",
            background: alpha(theme.palette.primary.main, 0.16),
            filter: "blur(2px)",
          },
        })}
      >
        <Container
          maxWidth="lg"
          sx={{ position: "relative", py: { xs: 7, md: 10 } }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "0.82fr 1.18fr" },
              alignItems: "center",
              gap: { xs: 6, md: 5 },
            }}
          >
            <motion.div
              initial="hidden"
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.55 }}
            >
              <Stack spacing={2.5} sx={{ maxWidth: 540 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: "primary.main",
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    fontSize: "0.68rem",
                  }}
                >
                  LE COCKPIT DE VOTRE ÉTABLISSEMENT
                </Typography>
                <Typography
                  component="h1"
                  sx={{
                    fontSize: { xs: "2.7rem", sm: "3.6rem", md: "4.2rem" },
                    lineHeight: 0.98,
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Toute votre école.
                  <Box
                    component="span"
                    sx={{ display: "block", color: "primary.main" }}
                  >
                    Une vue claire.
                  </Box>
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: "1rem", md: "1.08rem" },
                    lineHeight: 1.7,
                    maxWidth: 480,
                  }}
                >
                  Intellino rassemble élèves, classes, paiements et équipes dans
                  un seul espace pour vous aider à décider plus vite.
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "stretch", sm: "center" }}
                >
                  <Button
                    component={RouterLink}
                    to="/create-school"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ borderRadius: 2, px: 2.5, py: 1.3 }}
                  >
                    Créer mon établissement
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/contact"
                    variant="outlined"
                    size="large"
                    sx={{ borderRadius: 2, px: 2.5, py: 1.3 }}
                  >
                    Voir une démonstration
                  </Button>
                </Stack>
                <Stack
                  direction="row"
                  spacing={2.5}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ pt: 1 }}
                >
                  {[
                    "Installation rapide",
                    "Données sécurisées",
                    "Accessible partout",
                  ].map((item) => (
                    <Stack
                      direction="row"
                      spacing={0.7}
                      alignItems="center"
                      key={item}
                    >
                      <CheckCircleIcon
                        sx={{ color: "primary.main", fontSize: 18 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {item}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 28, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <Box
                sx={{
                  position: "relative",
                  ml: { md: 2 },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: "8% 4% -4% 8%",
                    border: "1px solid",
                    borderColor: "primary.main",
                    opacity: 0.25,
                    transform: "rotate(3deg)",
                    zIndex: 0,
                  },
                }}
              >
                <Box
                  component="img"
                  src={dashboardImg}
                  alt="Tableau de bord Intellino"
                  fetchPriority="high"
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    display: "block",
                    width: "100%",
                    borderRadius: 3,
                    filter: "drop-shadow(0 26px 36px rgba(0, 0, 0, 0.38))",
                  }}
                />
              </Box>
            </motion.div>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            borderTop: "1px solid",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {[
            {
              value: "01",
              label: "Une seule vue",
              text: "Pour toute la direction",
            },
            {
              value: "06+",
              label: "Modules réunis",
              text: "Sans outils dispersés",
            },
            {
              value: "24/7",
              label: "Accès sécurisé",
              text: "Sur tous vos appareils",
            },
            { value: "∞", label: "Données utiles", text: "Pour mieux décider" },
          ].map((stat, index) => (
            <Box
              key={stat.label}
              sx={{
                py: 2.5,
                px: { xs: 1.5, md: 3 },
                borderRight: index < 3 ? "1px solid" : "none",
                borderColor: "divider",
              }}
            >
              <Typography
                sx={{
                  color: "primary.main",
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </Typography>
              <Typography sx={{ mt: 1, fontWeight: 800, fontSize: "0.82rem" }}>
                {stat.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

      <Box
        component="section"
        id="features"
        sx={{ py: { xs: 7, md: 10 }, scrollMarginTop: 70 }}
      >
        <Container maxWidth="lg">
          <Stack spacing={1} sx={{ maxWidth: 610, mb: 5 }}>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 800,
                letterSpacing: "0.16em",
              }}
            >
              UN ESPACE QUI TRAVAILLE AVEC VOUS
            </Typography>
            <Typography
              component="h2"
              sx={{
                fontSize: { xs: "2rem", md: "2.8rem" },
                lineHeight: 1.05,
                fontWeight: 800,
              }}
            >
              Moins de dispersion. Plus de maîtrise.
            </Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
              Les opérations essentielles de votre établissement sont réunies
              dans un parcours simple, pensé pour les journées qui ne
              ralentissent jamais.
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 1.5,
            }}
          >
            {modules.map(({ icon: Icon, title, text }, index) => (
              <motion.div
                key={title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={reveal}
                transition={{ duration: 0.4, delay: index * 0.04 }}
              >
                <Box
                  sx={{
                    height: "100%",
                    p: 2.5,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    transition: "border-color .2s, transform .2s",
                    "&:hover": {
                      borderColor: "primary.main",
                      transform: "translateY(-3px)",
                    },
                  }}
                >
                  <Icon sx={{ color: "primary.main", fontSize: 28, mb: 2 }} />
                  <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.8, lineHeight: 1.6 }}
                  >
                    {text}
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </Container>
      </Box>

      <Box
        component="section"
        sx={{
          py: { xs: 7, md: 10 },
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "0.8fr 1.2fr" },
              gap: { xs: 4, md: 8 },
              alignItems: "center",
            }}
          >
            <Stack spacing={1.5}>
              <Typography
                variant="overline"
                sx={{
                  color: "primary.main",
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                }}
              >
                POUR CHAQUE JOURNÉE DANS L'ÉCOLE
              </Typography>
              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: "2rem", md: "2.7rem" },
                  lineHeight: 1.05,
                  fontWeight: 800,
                }}
              >
                Une expérience adaptée à chaque rôle.
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Un même système, des usages différents. Chacun retrouve
                rapidement les informations qui lui sont utiles.
              </Typography>
              <Tabs
                value={audienceIndex}
                onChange={(_, value) => setAudienceIndex(value)}
                variant="scrollable"
                scrollButtons={false}
                sx={{
                  mt: 1,
                  "& .MuiTabs-indicator": { height: 3, borderRadius: 2 },
                }}
              >
                {audiences.map(({ label }) => (
                  <Tab
                    key={label}
                    label={label}
                    sx={{ px: 1.5, minWidth: "auto", fontWeight: 700 }}
                  />
                ))}
              </Tabs>
            </Stack>
            <motion.div
              key={audience.label}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "0.75fr 1.25fr" },
                  gap: 3,
                  alignItems: "center",
                  p: { xs: 2, md: 3 },
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.default",
                }}
              >
                <Box
                  component="img"
                  src={audience.image}
                  alt={audience.label}
                  sx={{
                    width: "100%",
                    height: { xs: 220, sm: 280 },
                    objectFit: "contain",
                    alignSelf: "end",
                  }}
                />
                <Stack spacing={1.5}>
                  <Typography
                    variant="overline"
                    sx={{ color: "primary.main", fontWeight: 800 }}
                  >
                    {audience.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1.35rem",
                      fontWeight: 800,
                      lineHeight: 1.15,
                    }}
                  >
                    {audience.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {audience.text}
                  </Typography>
                  <Stack spacing={0.8}>
                    {audience.points.map((point) => (
                      <Stack
                        direction="row"
                        spacing={0.8}
                        alignItems="center"
                        key={point}
                      >
                        <CheckCircleIcon
                          sx={{ color: "primary.main", fontSize: 18 }}
                        />
                        <Typography variant="body2">{point}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </Box>
            </motion.div>
          </Box>
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: { xs: 5, md: 8 },
              alignItems: "center",
            }}
          >
            <Box sx={{ order: { xs: 2, md: 1 } }}>
              <Typography
                variant="overline"
                sx={{
                  color: "primary.main",
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                }}
              >
                PILOTER AVEC CONFIANCE
              </Typography>
              <Typography
                component="h2"
                sx={{
                  mt: 1,
                  fontSize: { xs: "2rem", md: "2.7rem" },
                  lineHeight: 1.05,
                  fontWeight: 800,
                }}
              >
                Les chiffres importants restent visibles.
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mt: 2, lineHeight: 1.7 }}
              >
                Paiements, dépenses, effectifs et activités récentes sont réunis
                pour vous donner une lecture immédiate de la situation.
              </Typography>
              <Stack spacing={1.2} sx={{ mt: 3 }}>
                {[
                  {
                    icon: AccountBalanceWalletOutlinedIcon,
                    text: "Suivez les paiements et la trésorerie.",
                  },
                  {
                    icon: AssessmentOutlinedIcon,
                    text: "Comparez les tendances avec des rapports lisibles.",
                  },
                  {
                    icon: SecurityOutlinedIcon,
                    text: "Gardez vos données protégées et accessibles.",
                  },
                ].map(({ icon: Icon, text }) => (
                  <Stack
                    direction="row"
                    spacing={1.2}
                    alignItems="center"
                    key={text}
                  >
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        display: "grid",
                        placeItems: "center",
                        color: "primary.main",
                        bgcolor: (theme) =>
                          alpha(theme.palette.primary.main, 0.12),
                      }}
                    >
                      <Icon sx={{ fontSize: 19 }} />
                    </Box>
                    <Typography variant="body2">{text}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
            <Box
              sx={{
                order: { xs: 1, md: 2 },
                p: { xs: 1, md: 2 },
                bgcolor: "#0a0908",
                border: "1px solid",
                borderColor: "divider",
                transform: { md: "rotate(1.5deg)" },
              }}
            >
              <Box
                component="img"
                src={comptImg}
                alt="Aperçu du pilotage financier dans Intellino"
                sx={{ display: "block", width: "100%", opacity: 0.94 }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      <Box
        component="section"
        sx={(theme) => ({
          py: { xs: 7, md: 10 },
          bgcolor: theme.palette.mode === "dark" ? "#11100e" : "#f0eee8",
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: "divider",
        })}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "0.72fr 1.28fr" },
              gap: { xs: 4, md: 8 },
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <Stack spacing={1.5} sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AutoAwesomeIcon sx={{ color: "primary.main" }} />
                <Typography
                  variant="overline"
                  sx={{ color: "primary.main", fontWeight: 800 }}
                >
                  INTELLIGENCE UTILE
                </Typography>
              </Stack>
              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: "2rem", md: "2.8rem" },
                  lineHeight: 1.05,
                  fontWeight: 800,
                }}
              >
                Posez une question. Voyez la décision se préciser.
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Une démonstration simulée de l’assistant Intellino, adaptée au
                rôle de chaque membre de votre établissement.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {aiDemos.map((demo, index) => (
                  <Button
                    key={demo.role}
                    onClick={() => setAiDemoIndex(index)}
                    variant={index === aiDemoIndex ? "contained" : "outlined"}
                    size="small"
                    sx={{ borderRadius: 10, textTransform: "none" }}
                  >
                    {demo.role}
                  </Button>
                ))}
              </Stack>
              <Button
                component={RouterLink}
                to="/create-school"
                variant="text"
                endIcon={<ArrowForwardIcon />}
                sx={{ alignSelf: "flex-start", px: 0, fontWeight: 800 }}
              >
                Découvrir l’espace complet
              </Button>
            </Stack>

            <motion.div
              key={aiDemo.role}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.35 }}
              style={{ minWidth: 0, maxWidth: "100%" }}
            >
              <Card
                sx={(theme) => ({
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "0 18px 50px rgba(0,0,0,.12)",
                  bgcolor: "background.default",
                })}
              >
                <Box
                  sx={{
                    px: { xs: 2, md: 3 },
                    py: 1.5,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ minWidth: 0, maxWidth: "100%" }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: aiDemo.accent,
                      }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      sx={{ minWidth: 0, overflowWrap: "anywhere" }}
                    >
                      Assistant · {aiDemo.role}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Démonstration
                  </Typography>
                </Box>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Stack spacing={2.2}>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <Avatar
                        sx={{ bgcolor: "text.primary", width: 34, height: 34 }}
                      >
                        {aiDemo.role.charAt(0)}
                      </Avatar>
                      <Box
                        sx={{
                          px: 2,
                          py: 1.2,
                          bgcolor: (theme) =>
                            alpha(theme.palette.text.primary, 0.06),
                          maxWidth: "82%",
                          minWidth: 0,
                        }}
                      >
                        <Typography variant="body2" fontWeight={700}>
                          {aiDemo.question}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <Avatar
                        sx={{ bgcolor: aiDemo.accent, width: 34, height: 34 }}
                      >
                        <AutoAwesomeIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                          {aiDemo.answer}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 1 }}
                        >
                          Réponse simulée à partir de données d’établissement.
                        </Typography>
                      </Box>
                    </Stack>
                    <Divider />
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      {aiDemo.metrics.map(([label, value]) => (
                        <Box key={label} sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">
                            {label}
                          </Typography>
                          <Typography variant="h6" fontWeight={800}>
                            {value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TrendingUpIcon
                        sx={{ color: aiDemo.accent, fontSize: 19 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Une lecture claire pour agir au bon moment.
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Box>
        </Container>
      </Box>

      <SchoolsSection />

      <Box
        component="section"
        sx={{
          py: { xs: 7, md: 9 },
          bgcolor: "primary.main",
          color: "primary.contrastText",
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Box sx={{ maxWidth: 620 }}>
              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: "2rem", md: "2.8rem" },
                  fontWeight: 800,
                  lineHeight: 1.05,
                }}
              >
                Reprenez le contrôle de votre établissement.
              </Typography>
              <Typography sx={{ mt: 1.5, opacity: 0.86 }}>
                Une démonstration suffit pour voir ce que votre équipe peut
                gagner au quotidien.
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/contact"
              variant="contained"
              color="secondary"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ borderRadius: 2, px: 2.5, py: 1.3, flexShrink: 0 }}
            >
              Demander une démonstration
            </Button>
          </Stack>
        </Container>
      </Box>

      <ChatbotWidget />
    </Box>
  );
}

function SchoolsSection() {
  const { data: schools } = useApiGet("/schools");
  const [selectedSchool, setSelectedSchool] = useState(null);
  const schoolList = Array.isArray(schools)
    ? schools
    : Array.isArray(schools?.data)
      ? schools.data
      : [];

  if (schoolList.length === 0) return null;

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 7, md: 9 },
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 800,
                letterSpacing: "0.16em",
              }}
            >
              DÉJÀ DANS LE RÉSEAU
            </Typography>
            <Typography
              component="h2"
              sx={{
                mt: 0.8,
                fontSize: { xs: "1.9rem", md: "2.4rem" },
                fontWeight: 800,
              }}
            >
              Des établissements à portée de main.
            </Typography>
          </Box>
          <Typography
            color="text.secondary"
            sx={{ maxWidth: 360, lineHeight: 1.6 }}
          >
            Envoyez une demande de pré-inscription à une école partenaire en
            quelques clics.
          </Typography>
        </Stack>
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            overflowX: "auto",
            pb: 1,
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "divider",
              borderRadius: 3,
            },
          }}
        >
          {schoolList.map((school, index) => (
            <motion.div
              key={school.id}
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.04 }}
            >
              <Card
                variant="outlined"
                sx={{
                  width: 260,
                  flexShrink: 0,
                  borderRadius: 1.5,
                  bgcolor: "background.default",
                }}
              >
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={1.2}
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Avatar
                      src={school.logo_url ?? undefined}
                      variant="rounded"
                    >
                      {school.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap fontWeight={800}>
                        {school.name}
                      </Typography>
                      <Typography
                        noWrap
                        variant="caption"
                        color="text.secondary"
                      >
                        {[school.city, school.country?.name]
                          .filter(Boolean)
                          .join(", ")}
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    fullWidth
                    size="small"
                    variant="outlined"
                    onClick={() => setSelectedSchool(school)}
                  >
                    Envoyer une demande
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>
        <Divider sx={{ mt: 4 }} />
      </Container>
      <EnrollmentRequestModal
        open={Boolean(selectedSchool)}
        school={selectedSchool}
        onClose={() => setSelectedSchool(null)}
      />
    </Box>
  );
}
