import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  LinearProgress,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { motion } from "motion/react";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import School2Icon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import PaymentsIcon from "@mui/icons-material/Payments";
import GroupsIcon from "@mui/icons-material/Groups";
import EventIcon from "@mui/icons-material/Event";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import ScheduleIcon from "@mui/icons-material/Schedule";
import BadgeIcon from "@mui/icons-material/Badge";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import DescriptionIcon from "@mui/icons-material/Description";
import MonthlyFinanceChart from "../components/MonthlyFinanceChart.jsx";
import ClassAverageChart from "../components/ClassAverageChart.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { useSchools } from "../hooks/useSchools.js";
import SuperAdminOverviewPage from "./SuperAdminOverviewPage.jsx";
import ProviderProfilePage from "./ProviderProfilePage.jsx";

const STAFF_ROLE_SLUGS = [
  "directeur",
  "censeur",
  "surveillant",
  "secretaire",
  "comptable",
];

const ACTIVITY_ICONS = {
  payment: <PaymentsIcon fontSize="small" />,
  enrollment: <PersonAddAltIcon fontSize="small" />,
  justification: <FactCheckIcon fontSize="small" />,
};

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `Il y a ${days} j`;
}

const QUICK_ACTIONS_BY_ROLE = {
  directeur: [
    {
      label: "Ajouter un membre",
      to: "/dashboard/members",
      icon: <GroupsIcon />,
    },
    {
      label: "Ajouter une classe",
      to: "/dashboard/classes",
      icon: <MenuBookIcon />,
    },
    {
      label: "Inscrire des élèves",
      to: "/dashboard/students",
      icon: <School2Icon />,
    },
    {
      label: "Créer un événement",
      to: "/dashboard/events",
      icon: <EventIcon />,
    },
  ],
  secretaire: [
    {
      label: "Inscrire des élèves",
      to: "/dashboard/students",
      icon: <School2Icon />,
    },
    {
      label: "Encaisser un paiement",
      to: "/dashboard/payments",
      icon: <PaymentsIcon />,
    },
    {
      label: "Créer un événement",
      to: "/dashboard/events",
      icon: <EventIcon />,
    },
  ],
  comptable: [
    {
      label: "Encaisser un paiement",
      to: "/dashboard/payments",
      icon: <PaymentsIcon />,
    },
    {
      label: "Créer un événement",
      to: "/dashboard/events",
      icon: <EventIcon />,
    },
  ],
  censeur: [
    {
      label: "Justifications d'absences",
      to: "/dashboard/attendance-justifications",
      icon: <FactCheckIcon />,
    },
    {
      label: "Créer un événement",
      to: "/dashboard/events",
      icon: <EventIcon />,
    },
  ],
  surveillant: [
    {
      label: "Justifications d'absences",
      to: "/dashboard/attendance-justifications",
      icon: <FactCheckIcon />,
    },
    {
      label: "Créer un événement",
      to: "/dashboard/events",
      icon: <EventIcon />,
    },
  ],
  professeur: [
    {
      label: "Mes cours",
      to: "/dashboard/my-assignments",
      icon: <MenuBookOutlinedIcon />,
    },
    {
      label: "Mon emploi du temps",
      to: "/dashboard/my-timetable",
      icon: <ScheduleIcon />,
    },
    { label: "Événements", to: "/dashboard/events", icon: <EventIcon /> },
  ],
  parent: [
    {
      label: "Paiements",
      to: "/dashboard/my-children-payments",
      icon: <PaymentsIcon />,
    },
    {
      label: "Absences de mes enfants",
      to: "/dashboard/my-children-attendances",
      icon: <EventBusyIcon />,
    },
    { label: "Événements", to: "/dashboard/events", icon: <EventIcon /> },
  ],
  eleve: [
    {
      label: "Mon bulletin",
      to: "/dashboard/my-bulletin",
      icon: <DescriptionIcon />,
    },
    {
      label: "Ma cantine",
      to: "/dashboard/my-wallet",
      icon: <RestaurantIcon />,
    },
    {
      label: "Mon badge cantine",
      to: "/dashboard/my-badge",
      icon: <BadgeIcon />,
    },
    {
      label: "Mes cours",
      to: "/dashboard/my-courses",
      icon: <MenuBookOutlinedIcon />,
    },
  ],
};

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { schoolUsers, loading, error } = useSchools();

  const current = schoolUsers.find(
    (su) => su.school?.id === user.current_school_id,
  );
  const isStaff =
    Boolean(current) && STAFF_ROLE_SLUGS.includes(current.role?.slug);
  const quickActions = current
    ? (QUICK_ACTIONS_BY_ROLE[current.role?.slug] ?? [])
    : [];
  const { data: summary, error: summaryError } = useApiGet(
    isStaff ? `/schools/${current.school?.id}/dashboard-summary` : null,
    { enabled: isStaff },
  );
  // Résumé équivalent pour un élève avec son propre compte, mais scopé à
  // des chiffres non-sensibles (effectifs, pas de paiement/montant d'un
  // autre élève) + ses propres statistiques — jamais /dashboard-summary,
  // qui contient les finances de l'école entière.
  const isEleve = current?.role?.slug === "eleve";
  const { data: studentSummary } = useApiGet(
    isEleve ? `/schools/${current.school?.id}/my-dashboard-summary` : null,
    { enabled: isEleve },
  );
  // Résumé pour un professeur : ses propres classes/matières/élèves et
  // son emploi du temps du jour — jamais les données des autres profs ni
  // les finances de l'école.
  const isProfesseur = current?.role?.slug === "professeur";
  const { data: teachingSummary } = useApiGet(
    isProfesseur ? `/schools/${current.school?.id}/my-teaching-summary` : null,
    { enabled: isProfesseur },
  );

  // Le superadmin n'a pas d'école : son tableau de bord est une vue
  // d'ensemble de la plateforme, pas ce résumé pensé pour le personnel
  // d'école.
  if (user.role?.slug === "superadmin") {
    return <SuperAdminOverviewPage />;
  }

  // Le prestataire n'a pas d'école non plus : son "Vue d'ensemble" est
  // directement sa fiche (statut, abonnement), pas ce résumé d'école.
  if (user.role?.slug === "prestataire") {
    return <ProviderProfilePage />;
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
            Créez ou rejoignez une école depuis l'accueil pour accéder à votre
            tableau de bord.
          </Typography>
          <Button
            component={RouterLink}
            to="/create-school"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            sx={{ m: 2 }}
          >
            Créer une école
          </Button>
          <Button
            component={RouterLink}
            to="/"
            variant="outlined"
            size="large"
            fullWidth
          >
            Aller à l'accueil
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Vue d'ensemble
      </Typography>

      {current.role?.slug === "directeur" && (
        <Paper
          variant="outlined"
          sx={(theme) => ({
            p: { xs: 2.5, md: 3 },
            mb: 3,
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            borderColor: alpha(theme.palette.primary.main, 0.5),
            bgcolor: alpha(theme.palette.primary.main, 0.06),
          })}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: "background.paper",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AutoAwesomeIcon color="primary" />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 220 }}>
            <Typography fontWeight={700}>Assistant IA Intellino</Typography>
            <Typography variant="body2" color="text.secondary">
              « Combien d'élèves ont un solde impayé ce mois ? » — posez vos
              questions en langage naturel.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/dashboard/ai-assistant"
            variant="contained"
            color="primary"
          >
            Ouvrir l'assistant
          </Button>
        </Paper>
      )}

      {isStaff && summaryError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {summaryError}
        </Alert>
      )}

      {isStaff && summary && (
        <>
          {(summary.payments_pending_count > 0 ||
            summary.attendance_pending_justifications > 0) && (
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
                      <Button
                        component={RouterLink}
                        to="/dashboard/payments"
                        color="inherit"
                        size="small"
                      >
                        Voir
                      </Button>
                    }
                  >
                    {summary.payments_pending_count} paiement(s) en attente de
                    confirmation (
                    {Number(summary.payments_pending_amount).toLocaleString()}{" "}
                    FCFA)
                  </Alert>
                )}
                {summary.attendance_pending_justifications > 0 && (
                  <Alert
                    severity="warning"
                    action={
                      <Button
                        component={RouterLink}
                        to="/dashboard/attendance-justifications"
                        color="inherit"
                        size="small"
                      >
                        Voir
                      </Button>
                    }
                  >
                    {summary.attendance_pending_justifications} justification(s)
                    d'absence en attente
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
              {
                icon: <School2Icon color="primary" />,
                label: "Élèves inscrits",
                value: summary.students_count,
                trend:
                  summary.students_growth_pct != null
                    ? {
                        text: `+${summary.students_growth_pct}% ce mois`,
                        color: "success.main",
                      }
                    : null,
              },
              {
                icon: <PersonIcon color="primary" />,
                label: "Professeurs",
                value: summary.teachers_count,
              },
              {
                icon: <MenuBookIcon color="primary" />,
                label: "Classes",
                value: summary.classes_count,
              },
              {
                icon: <EventBusyIcon color="primary" />,
                label: "Absences aujourd'hui",
                value: summary.attendance_today_absent,
              },
              {
                icon: <PaymentsIcon color="primary" />,
                label: "Paiements (Mobile Money inclus)",
                value: `${Number(summary.payments_confirmed_amount).toLocaleString()} FCFA`,
                trend:
                  summary.payments_collection_rate != null
                    ? {
                        text: `${summary.payments_collection_rate}% collectés`,
                        color: "primary.main",
                      }
                    : null,
              },
              summary.attendance_rate != null && {
                icon: <FactCheckIcon color="primary" />,
                label: "Taux de présence",
                value: `${summary.attendance_rate}%`,
                trend:
                  summary.attendance_rate_trend_pt != null
                    ? {
                        text: `${summary.attendance_rate_trend_pt >= 0 ? "+" : ""}${summary.attendance_rate_trend_pt} pt`,
                        color:
                          summary.attendance_rate_trend_pt >= 0
                            ? "success.main"
                            : "error.main",
                      }
                    : null,
              },
            ]
              .filter(Boolean)
              .map((stat, i) => (
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
                        <Stack
                          direction="row"
                          spacing={1.5}
                          sx={{ alignItems: "center" }}
                        >
                          {stat.icon}
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {stat.label}
                            </Typography>
                            <Typography variant="h6">{stat.value}</Typography>
                            {stat.trend && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: stat.trend.color,
                                  fontWeight: 600,
                                }}
                              >
                                {stat.trend.text}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
          </Grid>

          {summary.monthly_trend && (
            <Box sx={{ mt: 3 }}>
              <MonthlyFinanceChart data={summary.monthly_trend} />
            </Box>
          )}
        </>
      )}

      {isEleve && studentSummary && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Mon école
          </Typography>
          <Grid container spacing={3}>
            {[
              {
                icon: <School2Icon color="primary" />,
                label: "Élèves inscrits",
                value: studentSummary.school.students_count,
              },
              {
                icon: <PersonIcon color="primary" />,
                label: "Professeurs",
                value: studentSummary.school.teachers_count,
              },
              {
                icon: <MenuBookIcon color="primary" />,
                label: "Classes",
                value: studentSummary.school.classes_count,
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
                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ alignItems: "center" }}
                      >
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

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Mes résultats
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Moyenne générale
                </Typography>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {studentSummary.me.average != null
                    ? `${studentSummary.me.average}/20`
                    : "—"}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    studentSummary.me.average != null
                      ? (studentSummary.me.average / 20) * 100
                      : 0
                  }
                  sx={{ height: 7, borderRadius: 4 }}
                />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: "center" }}
                  >
                    <EventBusyIcon color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Absences (année en cours)
                      </Typography>
                      <Typography variant="h6">
                        {studentSummary.me.absences}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: "center" }}
                  >
                    <ScheduleIcon color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Retards (année en cours)
                      </Typography>
                      <Typography variant="h6">
                        {studentSummary.me.retards}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {isProfesseur && teachingSummary && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Mon enseignement
          </Typography>
          <Grid container spacing={3}>
            {[
              {
                icon: <School2Icon color="primary" />,
                label: "Mes classes",
                value: teachingSummary.classes_count,
              },
              {
                icon: <MenuBookOutlinedIcon color="primary" />,
                label: "Mes matières",
                value: teachingSummary.subjects_count,
              },
              {
                icon: <PersonIcon color="primary" />,
                label: "Mes élèves",
                value: teachingSummary.students_count,
              },
              {
                icon: <ScheduleIcon color="primary" />,
                label: "Cours aujourd'hui",
                value: teachingSummary.today_slots.length,
              },
            ].map((stat, i) => (
              <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }}>
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
                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ alignItems: "center" }}
                      >
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

          {teachingSummary.today_slots.length > 0 && (
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
                Mon emploi du temps aujourd'hui
              </Typography>
              <Stack
                divider={
                  <Box
                    sx={{ borderTop: "1px solid", borderColor: "divider" }}
                  />
                }
              >
                {teachingSummary.today_slots.map((slot, i) => (
                  <Stack
                    key={i}
                    direction="row"
                    spacing={2}
                    sx={{ py: 1.25, alignItems: "center" }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ minWidth: 92 }}
                    >
                      {slot.start_time} – {slot.end_time}
                    </Typography>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {slot.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {slot.classe}
                        {slot.room ? ` · Salle ${slot.room}` : ""}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}

          {teachingSummary.average_by_class.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <ClassAverageChart data={teachingSummary.average_by_class} />
            </Box>
          )}
        </>
      )}

      {(summary?.recent_activity?.length > 0 || quickActions.length > 0) && (
        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          {summary?.recent_activity?.length > 0 && (
            <Grid size={{ xs: 12, md: quickActions.length > 0 ? 7 : 12 }}>
              <Paper
                sx={(theme) => ({
                  p: { xs: 3, md: 4 },
                  height: "100%",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.text.primary, 0.03),
                })}
              >
                <Typography variant="h6" gutterBottom>
                  Activité récente
                </Typography>
                <Stack
                  divider={
                    <Box
                      sx={{ borderTop: "1px solid", borderColor: "divider" }}
                    />
                  }
                >
                  {summary.recent_activity.map((event, i) => (
                    <Stack
                      key={`${event.type}-${event.at}-${i}`}
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: "flex-start", py: 1.25 }}
                    >
                      <Box
                        sx={(theme) => ({
                          width: 32,
                          height: 32,
                          borderRadius: 1.5,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: alpha(theme.palette.primary.main, 0.15),
                          color: "primary.main",
                        })}
                      >
                        {ACTIVITY_ICONS[event.type] ?? (
                          <FactCheckIcon fontSize="small" />
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {event.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {timeAgo(event.at)}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          )}

          {quickActions.length > 0 && (
            <Grid
              size={{
                xs: 12,
                md: summary?.recent_activity?.length > 0 ? 5 : 12,
              }}
            >
              <Paper
                sx={(theme) => ({
                  p: { xs: 3, md: 4 },
                  height: "100%",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.text.primary, 0.03),
                })}
              >
                <Typography variant="h6" gutterBottom>
                  Actions rapides
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ flexWrap: "wrap", gap: 1.5 }}
                >
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
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
