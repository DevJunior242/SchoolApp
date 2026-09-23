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
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import GroupsIcon from "@mui/icons-material/Groups";
import { BarChart } from "@mui/x-charts/BarChart";
import { useEffect, useState } from "react";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
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

function amount(value) {
  return Number(value ?? 0);
}

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const [children, setChildren] = useState([]);
  const [paymentSummaries, setPaymentSummaries] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(schoolId));
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      if (!schoolId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const childrenResponse = await api.get(
          `/schools/${schoolId}/my-children`,
        );
        const childList = asArray(childrenResponse.data);
        const results = await Promise.all(
          childList.map(async (child) => {
            const [paymentsResponse, attendanceResponse] = await Promise.all([
              api.get(`/schools/${schoolId}/students/${child.id}/payments`),
              api.get(`/schools/${schoolId}/students/${child.id}/attendances`),
            ]);

            return {
              child,
              payments: asObject(paymentsResponse.data),
              attendances: asArray(attendanceResponse.data),
            };
          }),
        );

        if (!active) return;
        setChildren(childList);
        setPaymentSummaries(
          results
            .map((result) => result.payments)
            .filter((summary) => summary !== null),
        );
        setAttendanceRows(
          results.flatMap((result) =>
            result.attendances.map((attendance) => ({
              ...attendance,
              childName: result.child.fullname ?? "Enfant",
            })),
          ),
        );
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Impossible de charger le tableau de bord parent.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [schoolId]);

  if (!schoolId) return <Alert severity="info">Aucune école active.</Alert>;
  if (loading) return <LinearProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const totalDue = paymentSummaries.reduce(
    (total, summary) => total + amount(summary.total_due),
    0,
  );
  const totalPaid = paymentSummaries.reduce(
    (total, summary) => total + amount(summary.total_confirmed),
    0,
  );
  const totalBalance = paymentSummaries.reduce(
    (total, summary) => total + amount(summary.balance),
    0,
  );
  const absences = attendanceRows.filter(
    (row) => Number(row.status) === 0,
  ).length;
  const lateArrivals = attendanceRows.filter(
    (row) => Number(row.status) === 2,
  ).length;
  const currency = (value) => `${value.toLocaleString("fr-FR")} FCFA`;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Tableau de bord parent
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Suivez la scolarité de vos enfants depuis un seul espace.
      </Typography>
      <QuickActions role="parent" />

      {children.length === 0 ? (
        <Alert severity="info">Aucun enfant rattaché à votre compte.</Alert>
      ) : (
        <>
          <Grid container spacing={2}>
            <StatCard
              icon={<GroupsIcon color="primary" />}
              label="Enfants suivis"
              value={children.length}
              detail="Dans l'école active"
            />
            <StatCard
              icon={<AccountBalanceWalletIcon color="success" />}
              label="Total payé"
              value={currency(totalPaid)}
              detail={`Sur ${currency(totalDue)} dus`}
            />
            <StatCard
              icon={<AccountBalanceWalletIcon color="warning" />}
              label="Reste à payer"
              value={currency(totalBalance)}
              detail="Toutes les scolarités"
            />
            <StatCard
              icon={<EventBusyIcon color="error" />}
              label="Absences"
              value={absences}
              detail={`${lateArrivals} retard(s)`}
            />
          </Grid>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ px: 1, pt: 1 }}>
                  Situation des paiements
                </Typography>
                <BarChart
                  height={280}
                  borderRadius={4}
                  hideLegend
                  series={[
                    {
                      data: [totalDue, totalPaid, totalBalance],
                      label: "Montant",
                    },
                  ]}
                  xAxis={[
                    {
                      scaleType: "band",
                      data: ["Total dû", "Payé", "Reste"],
                    },
                  ]}
                  yAxis={[{ min: 0 }]}
                  grid={{ horizontal: true }}
                  margin={{ left: 70, right: 20 }}
                />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                <Typography variant="h6" sx={{ px: 1, pt: 1 }}>
                  Présence des enfants
                </Typography>
                <BarChart
                  height={280}
                  borderRadius={4}
                  hideLegend
                  series={[{ data: [absences, lateArrivals], label: "Total" }]}
                  xAxis={[{ scaleType: "band", data: ["Absences", "Retards"] }]}
                  yAxis={[{ min: 0 }]}
                  grid={{ horizontal: true }}
                  margin={{ left: 45, right: 20 }}
                />
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
