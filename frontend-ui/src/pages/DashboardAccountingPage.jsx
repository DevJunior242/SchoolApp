import { useState } from "react";
import { Box, Card, CardContent, Grid, Tab, Tabs, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import DashboardPaymentsPage from "./DashboardPaymentsPage.jsx";
import DashboardExpensesPage from "./DashboardExpensesPage.jsx";
import DashboardTreasuryPage from "./DashboardTreasuryPage.jsx";

function StatCard({ label, value, color }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h6" fontWeight={700} sx={{ color }}>
            {value}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

function AccountingDashboardTab({ schoolId }) {
  const { data: summary } = useApiGet(schoolId ? `/schools/${schoolId}/dashboard-summary` : null);
  const { data: accountsData } = useApiGet(schoolId ? `/schools/${schoolId}/treasury-accounts` : null);
  const accounts = accountsData ?? [];
  const treasuryTotal = accounts.reduce((sum, a) => sum + Number(a?.balance ?? 0), 0);

  return (
    <Grid container spacing={2}>
      <StatCard label="Recettes confirmées" value={`${Number(summary?.payments_confirmed_amount ?? 0).toLocaleString()} FCFA`} />
      <StatCard label="Dépenses confirmées" value={`${Number(summary?.expenses_confirmed_amount ?? 0).toLocaleString()} FCFA`} />
      <StatCard
        label="Résultat net"
        value={`${Number(summary?.net_result ?? 0).toLocaleString()} FCFA`}
        color={Number(summary?.net_result ?? 0) >= 0 ? "success.main" : "error.main"}
      />
      <StatCard label="Solde total trésorerie" value={`${treasuryTotal.toLocaleString()} FCFA`} />
      {summary?.payments_collection_rate != null && (
        <StatCard label="Taux de collecte" value={`${summary.payments_collection_rate}%`} />
      )}
      {summary?.payments_pending_count > 0 && (
        <StatCard label="Paiements en attente" value={summary.payments_pending_count} color="warning.main" />
      )}
      {summary?.expenses_pending_count > 0 && (
        <StatCard label="Dépenses en attente" value={summary.expenses_pending_count} color="warning.main" />
      )}
    </Grid>
  );
}

export default function DashboardAccountingPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const [tab, setTab] = useState("recettes");

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Comptabilité
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3 }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        <Tab value="recettes" label="Recettes" />
        <Tab value="depenses" label="Dépenses" />
        <Tab value="caisse" label="Caisse" />
        <Tab value="comptes-bancaires" label="Comptes bancaires" />
        <Tab value="tableau-de-bord" label="Tableau de bord" />
      </Tabs>

      {tab === "recettes" && <DashboardPaymentsPage embedded />}
      {tab === "depenses" && <DashboardExpensesPage embedded />}
      {tab === "caisse" && <DashboardTreasuryPage embedded typeFilter="CASH" />}
      {tab === "comptes-bancaires" && <DashboardTreasuryPage embedded typeFilter="BANK" />}
      {tab === "tableau-de-bord" && <AccountingDashboardTab schoolId={schoolId} />}
    </Box>
  );
}
