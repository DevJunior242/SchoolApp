import { useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { motion } from "motion/react";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import ChatbotWidget from "../components/ChatbotWidget.jsx";
import directionImg from "../assets/characters/direction.png";
import enseignantImg from "../assets/characters/enseignant.png";
import parentsImg from "../assets/characters/parents.png";
import eleveImg from "../assets/characters/eleve.png";
import dashboardImg from "../assets/characters/mock.png";
const featuresList = [
  {
    icon: "👥",
    title: "Gestion des élèves",
    description: "Dossiers, inscriptions, suivi académique",
  },
  {
    icon: "📅",
    title: "Gestion scolaire",
    description: "Classes, emploi du temps, notes, examens",
  },
  {
    icon: "💳",
    title: "Finance & Comptabilité",
    description: "Frais scolaires, paiements, comptabilité",
  },
  {
    icon: "💬",
    title: "Communication",
    description: "Messages, notifications, annonces",
  },
  {
    icon: "👔",
    title: "Ressources Humaines",
    description: "Personnel, salaires, évaluations",
  },
  {
    icon: "📚",
    title: "Bibliothèque",
    description: "Gestion des livres, emprunts, retours",
  },
  {
    icon: "🍽️",
    title: "Cantine & Stock",
    description: "Gestion des menus, stocks et fournisseurs",
  },
  {
    icon: "📈",
    title: "Rapports & Analyses",
    description: "Statistiques, rapports personnalisés, tableaux de bord",
  },
];

const audiences = [
  {
    role: "Direction",
    image: directionImg,
    subtitle:
      "Pilotez votre établissement avec des tableaux de bord et des rapports en temps réel.",
    points: [
      "Vue globale & statistiques",
      "Prise de décision éclairée",
      "Gestion simplifiée",
    ],
  },
  {
    role: "Enseignants",
    image: enseignantImg,
    subtitle: "Gérez vos classes, notes et activités pédagogiques facilement.",
    points: [
      "Saisie des notes",
      "Suivi des présences",
      "Planification des cours",
    ],
  },
  {
    role: "Parents",
    image: parentsImg,
    subtitle:
      "Suivez la scolarité de vos enfants et restez informés en temps réel.",
    points: [
      "Notes et bulletins",
      "Paiements en ligne",
      "Communication facile",
    ],
  },
  {
    role: "Élèves",
    image: eleveImg,
    subtitle:
      "Accédez à vos informations et ressources scolaires où que vous soyez.",
    points: ["Emploi du temps", "Notes & résultats", "Ressources pédagogiques"],
  },
];

const benefits = [
  {
    icon: "⚡",
    title: "Gain de temps",
    description:
      "Automatisez les tâches administratives et concentrez-vous sur l'essentiel.",
  },
  {
    icon: "📊",
    title: "Meilleure gestion",
    description:
      "Des données précises pour une gestion efficace et des décisions éclairées.",
  },
  {
    icon: "💬",
    title: "Communication simplifiée",
    description:
      "Facilitez les échanges entre l'école, les parents, les enseignants et les élèves.",
  },
  {
    icon: "🛡️",
    title: "Sécurité maximale",
    description:
      "Vos données sont protégées avec des sauvegardes régulières et un haut niveau de sécurité.",
  },
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

  return (
    <Box
      sx={{
        bgcolor: "background.default",
        color: "text.primary",
        overflow: "hidden",
      }}
    >
      {/* =====================================================
          1. HERO
      ===================================================== */}

      <Box
        sx={(theme) => ({
          position: "relative",
          overflow: "hidden",
          py: { xs: 5, md: 6 },

          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(
                  135deg,
                  ${theme.palette.background.default} 0%,
                  ${alpha(theme.palette.primary.main, 0.06)} 100%
                )`
              : `linear-gradient(
                  135deg,
                  #ffffff 0%,
                  #f5f8ff 100%
                )`,
        })}
      >
        <Container maxWidth="lg">
          <Grid
            container
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "minmax(0, 5.5fr) minmax(0, 6.5fr)",
              },
              gap: { xs: 5, sm: 0 },
              alignItems: "start",
            }}
          >
            {/* HERO TEXTE */}
            <Box sx={{ minWidth: 0 }}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Typography
                  variant="overline"
                  color="primary.main"
                  fontWeight={800}
                  sx={{
                    letterSpacing: 1.2,
                    fontSize: "0.68rem",
                  }}
                >
                  PLATEFORME TOUT-EN-UN
                </Typography>

                <Typography
                  variant="h1"
                  sx={{
                    mt: 1,
                    mb: 2.5,
                    fontSize: {
                      xs: "2.35rem",
                      sm: "2.8rem",
                      md: "3rem",
                    },
                    fontWeight: 800,
                    lineHeight: 1.08,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Gérez votre école{" "}
                  <Box component="span" sx={{ color: "primary.main" }}>
                    simplement,
                    <br />
                    intelligemment
                    <br />
                    et efficacement.
                  </Box>
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    maxWidth: 530,
                    fontSize: "0.9rem",
                    lineHeight: 1.7,
                    mb: 3,
                  }}
                >
                  Intellino Gestion Scolaire est la solution complète pour
                  administrer votre établissement, de l'inscription des élèves à
                  la gestion financière.
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 2.5,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems="flex-start"
                    sx={{
                      width: "fit-content",
                      maxWidth: "100%",
                    }}
                  >
                    <Button
                      component={RouterLink}
                      to="/contact"
                      variant="contained"
                      size="large"
                      sx={{
                        px: 3,
                        py: 1.2,
                        borderRadius: 2,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        width: "fit-content",
                      }}
                    >
                      Demander une démo
                    </Button>

                    <Button
                      href="#features"
                      variant="outlined"
                      size="large"
                      sx={{
                        px: 3,
                        py: 1.2,
                        borderRadius: 2,
                        color: "text.primary",
                        borderColor: "divider",
                        whiteSpace: "nowrap",
                        width: "fit-content",
                      }}
                    >
                      ▶ Découvrir la plateforme
                    </Button>
                  </Stack>

                  {/* AVANTAGES HERO */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        sm: "repeat(4, minmax(0, 1fr))",
                      },
                      gap: 2,
                    }}
                  >
                    {[
                      ["🧩", "Complet", "Tous les modules essentiels réunis"],
                      ["🛡️", "Sécurisé", "Données protégées et sauvegardées"],
                      ["📱", "Accessible", "Partout, tout le temps"],
                      ["📈", "Évolutif", "S'adapte à la croissance"],
                    ].map(([icon, title, text]) => (
                      <Box key={title} sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: "1.25rem", mb: 0.5 }}>
                          {icon}
                        </Typography>
                        <Typography
                          fontWeight={800}
                          sx={{ fontSize: "0.72rem" }}
                        >
                          {title}
                        </Typography>
                        <Typography
                          color="text.secondary"
                          sx={{ fontSize: "0.58rem", lineHeight: 1.4 }}
                        >
                          {text}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </motion.div>
            </Box>

            {/* HERO IMAGE / DASHBOARD */}
            <Box
              sx={{
                display: "flex",
                minWidth: 0,
                justifyContent: "flex-end",
              }}
            >
              <motion.div
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{
                  duration: 0.7,
                  delay: 0.15,
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    minHeight: { xs: 220, sm: 340 },
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-end",
                    mt: { xs: 0, sm: -4 },
                  }}
                >
                  <Box
                    component="img"
                    src={dashboardImg}
                    alt="Aperçu du tableau de bord Intellino"
                    sx={{
                      position: "relative",
                      zIndex: 1,
                      display: "block",
                      width: "100%",
                      maxWidth: 600,
                      height: "auto",
                      objectFit: "contain",
                      borderRadius: 3,
                      filter: "drop-shadow(0 25px 35px rgba(0, 0, 0, .25))",
                    }}
                  />
                </Box>
              </motion.div>
            </Box>
          </Grid>
        </Container>
      </Box>
      {/* =====================================================
    2. MODULES
===================================================== */}

      <Container
        id="features"
        maxWidth="lg"
        sx={{
          py: { xs: 8, md: 10 },
          scrollMarginTop: 60,
        }}
      >
        {/* CONTENEUR PRINCIPAL */}
        <Box
          sx={{
            display: "flex",
            flexDirection: {
              xs: "column",
              md: "row",
            },
            gap: {
              xs: 5,
              md: 7,
            },
            alignItems: "center",
          }}
        >
          {/* ================= TEXTE ================= */}
          <Box
            sx={{
              width: {
                xs: "100%",
                md: "25%",
              },
              flexShrink: 0,
            }}
          >
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={800}
              sx={{
                fontSize: "0.62rem",
                letterSpacing: 1,
              }}
            >
              TOUT CE DONT VOUS AVEZ BESOIN
            </Typography>

            <Typography
              fontWeight={800}
              sx={{
                mt: 1,
                mb: 2,
                fontSize: {
                  xs: "2rem",
                  md: "1.7rem",
                  lg: "1.9rem",
                },
                lineHeight: 1.15,
              }}
            >
              Une solution complète
              <br />
              pour tous vos besoins
            </Typography>

            <Box
              sx={{
                width: 30,
                height: 2,
                bgcolor: "primary.main",
                borderRadius: 2,
              }}
            />
          </Box>

          {/* ================= CARTES ================= */}
          <Box
            sx={{
              flex: 1,
              width: "100%",

              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },

              gap: 1.5,
            }}
          >
            {featuresList.map((feat, index) => (
              <motion.div
                key={index}
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                  amount: 0.2,
                }}
                transition={{
                  duration: 0.35,
                  delay: index * 0.04,
                }}
                style={{
                  height: "100%",
                }}
              >
                <Paper
                  elevation={0}
                  sx={(theme) => ({
                    p: 2,
                    minHeight: 105,
                    height: "100%",
                    borderRadius: 2,

                    bgcolor: "background.paper",

                    border: "1px solid",
                    borderColor: "divider",

                    transition: "all .25s ease",

                    "&:hover": {
                      transform: "translateY(-4px)",
                      borderColor: theme.palette.primary.main,

                      boxShadow:
                        theme.palette.mode === "dark"
                          ? "0 12px 30px rgba(0,0,0,.35)"
                          : "0 12px 30px rgba(0,0,0,.08)",
                    },
                  })}
                >
                  {/* ICÔNE */}
                  <Typography
                    sx={{
                      fontSize: "1.35rem",
                      lineHeight: 1,
                      mb: 1.1,
                    }}
                  >
                    {feat.icon}
                  </Typography>

                  {/* TITRE */}
                  <Typography
                    fontWeight={800}
                    sx={{
                      fontSize: "0.78rem",
                      mb: 0.5,
                      lineHeight: 1.2,
                    }}
                  >
                    {feat.title}
                  </Typography>

                  {/* DESCRIPTION */}
                  <Typography
                    color="text.secondary"
                    sx={{
                      fontSize: "0.62rem",
                      lineHeight: 1.4,
                    }}
                  >
                    {feat.description}
                  </Typography>
                </Paper>
              </motion.div>
            ))}
          </Box>
        </Box>
      </Container>
      {/* =====================================================
          3. COMMUNAUTÉ ÉDUCATIVE
      ===================================================== */}

      <Box
        sx={(theme) => ({
          py: { xs: 8, md: 10 },
          bgcolor:
            theme.palette.mode === "dark"
              ? alpha(theme.palette.primary.main, 0.035)
              : alpha(theme.palette.primary.main, 0.025),
        })}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              textAlign: "center",
              maxWidth: 700,
              mx: "auto",
              mb: 6,
            }}
          >
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={800}
              sx={{
                fontSize: "0.65rem",
                letterSpacing: 1.2,
              }}
            >
              PENSÉ POUR CHAQUE UTILISATEUR
            </Typography>

            <Typography
              fontWeight={800}
              sx={{
                mt: 1,
                fontSize: {
                  xs: "1.7rem",
                  md: "2rem",
                },
              }}
            >
              Un outil adapté à toute la communauté éducative
            </Typography>
          </Box>
          <Grid
            container
            spacing={2}
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr", // mobile : 1
                sm: "repeat(2, 1fr)", // tablette : 2
                md: "repeat(4, 1fr)", // bureau : 4
              },
            }}
          >
            {audiences.map((aud, index) => (
              <motion.div
                key={index}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                  amount: 0.15,
                }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                }}
                style={{
                  height: "100%",
                  minWidth: 0,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    height: "100%",
                    overflow: "hidden",
                    borderRadius: 2.5,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      height: 180,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "flex-end",
                      overflow: "hidden",
                      bgcolor: "background.default",
                    }}
                  >
                    <Box
                      component="img"
                      src={aud.image}
                      alt={aud.role}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </Box>

                  <Box sx={{ p: 2 }}>
                    <Typography
                      fontWeight={800}
                      color="primary.main"
                      sx={{
                        fontSize: "0.95rem",
                        mb: 1,
                      }}
                    >
                      {aud.role}
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{
                        fontSize: "0.68rem",
                        lineHeight: 1.5,
                        mb: 2,
                        minHeight: 55,
                      }}
                    >
                      {aud.subtitle}
                    </Typography>

                    <Stack spacing={0.7}>
                      {aud.points.map((point) => (
                        <Typography
                          key={point}
                          sx={{
                            fontSize: "0.62rem",
                            color: "text.primary",
                          }}
                        >
                          <Box
                            component="span"
                            sx={{
                              color: "primary.main",
                              fontWeight: 800,
                              mr: 0.5,
                            }}
                          >
                            ✓
                          </Box>

                          {point}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                </Paper>
              </motion.div>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* =====================================================
          4. POURQUOI INTELLINO
      ===================================================== */}

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 9 } }}>
        <Paper
          elevation={0}
          sx={(theme) => ({
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            p: { xs: 3, md: 4 },
          })}
        >
          <Typography
            textAlign="center"
            fontWeight={800}
            sx={{
              fontSize: "0.72rem",
              letterSpacing: 1,
              mb: 3,
              textTransform: "uppercase",
            }}
          >
            Pourquoi choisir Intellino ?
          </Typography>

          <Grid
            container
            spacing={3}
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
            }}
          >
            {benefits.map((benefit) => (
              <Box
                key={benefit.title}
                sx={{
                  display: "flex",
                  gap: 1.5,
                  minWidth: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.7rem",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {benefit.icon}
                </Typography>

                <Box>
                  <Typography
                    fontWeight={800}
                    sx={{
                      fontSize: "0.78rem",
                      mb: 0.7,
                    }}
                  >
                    {benefit.title}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: "0.62rem",
                      lineHeight: 1.5,
                      opacity: 0.9,
                    }}
                  >
                    {benefit.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Grid>
        </Paper>
      </Container>

      {/* =====================================================
          5. CTA FINAL
      ===================================================== */}

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 9 } }}>
        <Paper
          elevation={0}
          sx={(theme) => ({
            position: "relative",
            overflow: "hidden",
            borderRadius: 3,
            p: { xs: 4, md: 5 },
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          })}
        >
          {/* décoration */}
          <Box
            sx={{
              position: "absolute",
              width: 250,
              height: 250,
              borderRadius: "50%",
              right: -100,
              top: -100,
              bgcolor: alpha("#fff", 0.08),
            }}
          />

          <Grid container alignItems="center" spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography
                fontWeight={800}
                sx={{
                  fontSize: {
                    xs: "1.5rem",
                    md: "1.8rem",
                  },
                  mb: 1,
                }}
              >
                Prêt à transformer la gestion de votre établissement ?
              </Typography>

              <Typography
                sx={{
                  fontSize: "0.8rem",
                  opacity: 0.9,
                }}
              >
                Rejoignez des centaines d'établissements qui nous font déjà
                confiance.
              </Typography>
            </Grid>

            <Grid
              item
              xs={12}
              md={4}
              sx={{
                display: "flex",
                justifyContent: {
                  xs: "flex-start",
                  md: "flex-end",
                },
              }}
            >
              <Button
                component={RouterLink}
                to="/contact"
                variant="contained"
                sx={{
                  bgcolor: "#fff",
                  color: "primary.main",
                  px: 3,
                  py: 1.3,
                  borderRadius: 2,
                  fontWeight: 800,

                  "&:hover": {
                    bgcolor: "#f5f5f5",
                  },
                }}
              >
                📅 Demander une démo
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Container>

      {/* =====================================================
          7. GARANTIES
      ===================================================== */}

      <Box
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          py: 3,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={2}>
            {[
              [
                "🔒",
                "Hébergé en toute sécurité",
                "Vos données sont protégées et sauvegardées régulièrement.",
              ],
              [
                "👥",
                "Accessible partout",
                "Utilisez Intellino sur tous vos appareils.",
              ],
              [
                "🔄",
                "Mises à jour continues",
                "Des améliorations régulières pour toujours plus de performance.",
              ],
              [
                "✓",
                "Confort & fiable",
                "Respect des normes et meilleures pratiques.",
              ],
            ].map(([icon, title, description]) => (
              <Grid item xs={12} sm={6} md={3} key={title}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "flex-start",
                  }}
                >
                  <Typography sx={{ fontSize: "1.2rem" }}>{icon}</Typography>

                  <Box>
                    <Typography
                      fontWeight={800}
                      sx={{
                        fontSize: "0.68rem",
                        mb: 0.3,
                      }}
                    >
                      {title}
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{
                        fontSize: "0.58rem",
                        lineHeight: 1.4,
                      }}
                    >
                      {description}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
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
        Des établissements déjà présents sur Edu.Intellino. Envoyez une demande
        de pré-inscription en quelques clics.
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
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ mb: 1.5, alignItems: "center" }}
                >
                  <Avatar src={school.logo_url ?? undefined} variant="rounded">
                    {school.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap>
                      {school.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {[school.city, school.country?.name]
                        .filter(Boolean)
                        .join(", ")}
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
