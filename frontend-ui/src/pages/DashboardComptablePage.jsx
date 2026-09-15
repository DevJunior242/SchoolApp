import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";

function fmt(value) {
  return `${Number(value ?? 0).toLocaleString("fr-FR")} FCFA`;
}

function StatCard({ label, value, color, icon }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "action.hover",
                color,
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color }}>
                {value}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

export default function DashboardComptablePage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;

  const { data: accountsData, error: accountsError } = useApiGet(
    schoolId ? `/schools/${schoolId}/treasury-accounts` : null,
  );

  const { data: confirmedPaymentsData, error: paymentsError } = useApiGet(
    schoolId ? `/schools/${schoolId}/payments` : null,
    {
      params: { status: 1, per_page: 100 },
    },
  );

  const { data: confirmedExpensesData, error: expensesError } = useApiGet(
    schoolId ? `/schools/${schoolId}/expenses` : null,
    {
      params: { status: 1, per_page: 100 },
    },
  );

  const { data: pendingPaymentsData } = useApiGet(
    schoolId ? `/schools/${schoolId}/payments` : null,
    {
      params: { status: 0, per_page: 6 },
    },
  );

  const accounts = accountsData ?? [];
  const confirmedPayments = confirmedPaymentsData?.data ?? [];
  const confirmedExpenses = confirmedExpensesData?.data ?? [];
  const pendingPayments = pendingPaymentsData?.data ?? [];

  const caisseTotal = accounts
    .filter((account) => account.type === "CASH")
    .reduce((sum, account) => sum + Number(account.balance ?? 0), 0);

  const banqueTotal = accounts
    .filter((account) => account.type === "BANK")
    .reduce((sum, account) => sum + Number(account.balance ?? 0), 0);

  const confirmedPaymentsTotal = confirmedPayments.reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0,
  );

  const confirmedExpensesTotal = confirmedExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount ?? 0),
    0,
  );

  const pendingPaymentsTotal = pendingPayments.reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0,
  );

  const thisMonthPayments = confirmedPayments.filter((payment) =>
    isThisMonth(
      payment.confirmed_at ?? payment.created_at ?? payment.payment_date,
    ),
  );

  const thisMonthExpenses = confirmedExpenses.filter((expense) =>
    isThisMonth(expense.expense_date),
  );

  const thisMonthPaymentsTotal = thisMonthPayments.reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0,
  );

  const thisMonthExpensesTotal = thisMonthExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount ?? 0),
    0,
  );

  const netMonth = thisMonthPaymentsTotal - thisMonthExpensesTotal;

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  const errors = [accountsError, paymentsError, expensesError].filter(Boolean);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Tableau de bord comptable
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Vue instantanée des encaisses, paiements et dépenses de l'école.
      </Typography>

      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errors[0]}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <StatCard
          label="Solde caisse"
          value={fmt(caisseTotal)}
          color="success.main"
          icon={<AccountBalanceIcon fontSize="small" />}
        />
        <StatCard
          label="Solde banque"
          value={fmt(banqueTotal)}
          color="info.main"
          icon={<AccountBalanceIcon fontSize="small" />}
        />
        <StatCard
          label="Paiements confirmés"
          value={fmt(confirmedPaymentsTotal)}
          color="success.main"
          icon={<PaymentsIcon fontSize="small" />}
        />
        <StatCard
          label="Dépenses confirmées"
          value={fmt(confirmedExpensesTotal)}
          color="error.main"
          icon={<ReceiptLongIcon fontSize="small" />}
        />
        <StatCard
          label="Paiements en attente"
          value={pendingPayments.length}
          color="warning.main"
          icon={<PaymentsIcon fontSize="small" />}
        />
        <StatCard
          label="Montant en attente"
          value={fmt(pendingPaymentsTotal)}
          color="warning.main"
          icon={<TrendingUpIcon fontSize="small" />}
        />
        <StatCard
          label="Recettes ce mois"
          value={fmt(thisMonthPaymentsTotal)}
          color="success.main"
          icon={<TrendingUpIcon fontSize="small" />}
        />
        <StatCard
          label="Dépenses ce mois"
          value={fmt(thisMonthExpensesTotal)}
          color="error.main"
          icon={<ReceiptLongIcon fontSize="small" />}
        />
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Paiements en attente
            </Typography>
            <Stack divider={<Divider />}>
              {pendingPayments.map((payment) => (
                <Stack
                  key={payment.id}
                  direction="row"
                  sx={{ alignItems: "center", gap: 1.5, py: 1.5 }}
                >
                  <PaymentsIcon color="warning" fontSize="small" />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {payment.student?.fullname ?? "Élève"} —{" "}
                      {payment.fee_structure?.label ?? "Paiement"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {payment.payment_method?.name ?? "Moyen inconnu"}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="warning.main"
                  >
                    {fmt(payment.amount)}
                  </Typography>
                </Stack>
              ))}
              {pendingPayments.length === 0 && (
                <Typography color="text.secondary" sx={{ py: 1.5 }}>
                  Aucun paiement en attente.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Résultat du mois
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Recettes
                </Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {fmt(thisMonthPaymentsTotal)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Dépenses
                </Typography>
                <Typography variant="h5" fontWeight={700} color="error.main">
                  {fmt(thisMonthExpensesTotal)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Résultat net
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  color={netMonth >= 0 ? "success.main" : "error.main"}
                >
                  {fmt(netMonth)}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
