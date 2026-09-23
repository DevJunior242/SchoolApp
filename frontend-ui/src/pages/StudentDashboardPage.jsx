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
import EventBusyIcon from "@mui/icons-material/EventBusy";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { BarChart } from "@mui/x-charts/BarChart";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { asArray, asObject } from "../utils/apiData.js";
import QuickActions from "../components/QuickActions.jsx";

function StatCard({ icon, label, value, detail }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
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

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const { data, loading, error } = useApiGet(
    schoolId ? `/schools/${schoolId}/my-dashboard-summary` : null,
  );
  const { data: studentProfile } = useApiGet(
    schoolId ? `/schools/${schoolId}/my-student-profile` : null,
  );
  const student = asObject(studentProfile);
  const { data: walletData } = useApiGet(
    schoolId && student?.id
      ? `/schools/${schoolId}/students/${student.id}/wallet`
      : null,
  );
  const summary = asArray(data)[0] ?? null;
  const school = summary?.school;
  const me = summary?.me;
  const wallet = asObject(walletData)?.wallet;

  if (!schoolId) {
    return <Alert severity="info">Aucune école active.</Alert>;
  }

  if (loading) {
    return <LinearProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!school || !me) {
    return <Alert severity="info">Aucune statistique élève disponible.</Alert>;
  }

  const average = me.average == null ? null : Number(me.average);
  const averageProgress =
    average == null ? 0 : Math.min(100, Math.max(0, (average / 20) * 100));

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Mon tableau de bord
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Retrouvez ici vos résultats et vos indicateurs scolaires.
      </Typography>
      <QuickActions role="eleve" />

      <Grid container spacing={2}>
        <StatCard
          icon={<TrendingUpIcon color="primary" />}
          label="Ma moyenne générale"
          value={average == null ? "—" : `${average}/20`}
          detail="Année scolaire en cours"
        />
        <StatCard
          icon={<EventBusyIcon color="warning" />}
          label="Absences"
          value={me.absences ?? 0}
          detail="Année scolaire en cours"
        />
        <StatCard
          icon={<ScheduleIcon color="info" />}
          label="Retards"
          value={me.retards ?? 0}
          detail="Année scolaire en cours"
        />
        <StatCard
          icon={<AccountBalanceWalletIcon color="success" />}
          label="Solde de ma cantine"
          value={
            wallet?.balance == null
              ? "—"
              : `${Number(wallet.balance).toLocaleString("fr-FR")} FCFA`
          }
          detail="Portefeuille personnel"
        />
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Progression de ma moyenne
            </Typography>
            <Typography variant="h3" fontWeight={700}>
              {average == null ? "—" : `${average}/20`}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={averageProgress}
              sx={{ mt: 2, height: 9, borderRadius: 5 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Objectif : progresser régulièrement, période après période.
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" sx={{ px: 1, pt: 1 }}>
              Présence et ponctualité
            </Typography>
            <BarChart
              height={260}
              hideLegend
              borderRadius={4}
              series={[
                {
                  data: [Number(me.absences ?? 0), Number(me.retards ?? 0)],
                  label: "Total",
                },
              ]}
              xAxis={[{ scaleType: "band", data: ["Absences", "Retards"] }]}
              yAxis={[{ min: 0 }]}
              grid={{ horizontal: true }}
              margin={{ left: 45, right: 20 }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
