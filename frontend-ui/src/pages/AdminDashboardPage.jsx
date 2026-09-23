import { asArray } from "../utils/apiData.js";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SchoolIcon from "@mui/icons-material/School";
import GroupsIcon from "@mui/icons-material/Groups";
import ClassIcon from "@mui/icons-material/Class";
import PaymentsIcon from "@mui/icons-material/Payments";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { useSchools } from "../hooks/useSchools.js";
import QuickActions from "../components/QuickActions.jsx";

function formatAmount(value, currency = "XOF") {
  return `${Number(value ?? 0).toLocaleString("fr-FR")} ${currency}`;
}

function StatCard({ icon, label, value, detail }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {icon}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {value}
              </Typography>
              {detail && (
                <Typography variant="caption" color="text.secondary">
                  {detail}
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const {
    schoolUsers,
    loading: schoolsLoading,
    error: schoolsError,
  } = useSchools();
  const current = schoolUsers.find(
    (schoolUser) => schoolUser.school?.id === user.current_school_id,
  );
  const schoolId = current?.school?.id;
  const {
    data: summaryData,
    loading,
    error,
  } = useApiGet(schoolId ? `/schools/${schoolId}/dashboard-summary` : null, {
    enabled: Boolean(schoolId),
  });
  const summary = asArray(summaryData)[0] ?? null;

  if (schoolsLoading || loading) {
    return <LinearProgress />;
  }

  if (schoolsError || error) {
    return <Alert severity="error">{schoolsError || error}</Alert>;
  }

  if (!current || !summary) {
    return <Alert severity="info">Aucune école active.</Alert>;
  }

  const currency = summary.currency || "XOF";
  const attendanceRate = summary.attendance_rate ?? 0;
  const trend = summary.attendance_rate_trend_pt;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Tableau de bord administrateur
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Vue générale de {current.school?.name} et de son activité.
      </Typography>
      <QuickActions role="admin" />

      <Grid container spacing={2}>
        <StatCard
          icon={<SchoolIcon color="primary" />}
          label="Élèves inscrits"
          value={summary.students_count}
          detail={
            summary.students_growth_pct != null
              ? `${summary.students_growth_pct}% ce mois-ci`
              : undefined
          }
        />
        <StatCard
          icon={<GroupsIcon color="primary" />}
          label="Enseignants"
          value={summary.teachers_count}
        />
        <StatCard
          icon={<ClassIcon color="primary" />}
          label="Classes actives"
          value={summary.classes_count}
        />
        <StatCard
          icon={<PaymentsIcon color="success" />}
          label="Recettes du mois"
          value={formatAmount(summary.payments_month_amount, currency)}
        />
        <StatCard
          icon={<TrendingUpIcon color="success" />}
          label="Résultat net"
          value={formatAmount(summary.net_result, currency)}
          detail={`${formatAmount(summary.payments_confirmed_amount, currency)} encaissés`}
        />
        <StatCard
          icon={<EventBusyIcon color="warning" />}
          label="Absences aujourd'hui"
          value={summary.attendance_today_absent}
          detail={`${summary.attendance_pending_justifications} justification(s) en attente`}
        />
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            variant="outlined"
            sx={(theme) => ({
              p: 3,
              height: "100%",
              bgcolor: alpha(theme.palette.text.primary, 0.02),
            })}
          >
            <Typography variant="h6" gutterBottom>
              Assiduité du mois
            </Typography>
            <Typography variant="h3" fontWeight={700}>
              {summary.attendance_rate != null
                ? `${summary.attendance_rate}%`
                : "—"}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.max(0, attendanceRate))}
              sx={{ mt: 2, height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {trend == null
                ? "Aucune comparaison disponible"
                : `${trend >= 0 ? "+" : ""}${trend} point(s) par rapport au mois dernier`}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Activité récente
            </Typography>
            <Stack spacing={1.5}>
              {(summary.recent_activity ?? []).length === 0 ? (
                <Typography color="text.secondary">
                  Aucune activité récente.
                </Typography>
              ) : (
                summary.recent_activity.slice(0, 6).map((activity, index) => (
                  <Stack key={activity.id ?? index} direction="row" spacing={1}>
                    <Typography variant="body2" fontWeight={600}>
                      {activity.label || activity.description || "Activité"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {activity.created_at
                        ? new Date(activity.created_at).toLocaleDateString(
                            "fr-FR",
                          )
                        : ""}
                    </Typography>
                  </Stack>
                ))
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
