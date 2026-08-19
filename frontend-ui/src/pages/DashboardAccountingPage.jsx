import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Button,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import InboxIcon from "@mui/icons-material/Inbox";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import DashboardPaymentsPage from "./DashboardPaymentsPage.jsx";
import DashboardExpensesPage from "./DashboardExpensesPage.jsx";
import DashboardTreasuryPage from "./DashboardTreasuryPage.jsx";
import CafeteriaRechargesTab from "../components/CafeteriaRechargesTab.jsx";

function fmt(n) {
  return `${Number(n ?? 0).toLocaleString()} FCFA`;
}

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

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function AccountingDashboardTab({ schoolId }) {
  const { data: summary } = useApiGet(schoolId ? `/schools/${schoolId}/dashboard-summary` : null);
  const { data: accountsData } = useApiGet(schoolId ? `/schools/${schoolId}/treasury-accounts` : null);
  const accounts = accountsData ?? [];
  const caisseTotal = accounts.filter((a) => a.type === "CASH").reduce((sum, a) => sum + Number(a?.balance ?? 0), 0);
  const banqueTotal = accounts.filter((a) => a.type === "BANK").reduce((sum, a) => sum + Number(a?.balance ?? 0), 0);

  const { data: pendingData } = useApiGet(schoolId ? `/schools/${schoolId}/payments` : null, {
    params: { status: 0, per_page: 6 },
  });
  const pending = pendingData?.data ?? [];

  const { data: expensesData } = useApiGet(schoolId ? `/schools/${schoolId}/expenses` : null, {
    params: { status: 1, per_page: 100 },
  });
  const monthExpenses = (expensesData?.data ?? []).filter((e) => isThisMonth(e?.expense_date));
  const byCategory = {};
  monthExpenses.forEach((e) => {
    const name = e.expense_category?.name ?? "Sans catégorie";
    byCategory[name] = (byCategory[name] ?? 0) + Number(e.amount);
  });
  const maxCategoryAmount = Math.max(1, ...Object.values(byCategory));

  return (
    <Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Vue consolidée pour la direction, mise à jour en temps réel à chaque opération.
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <StatCard label="Encaissements du jour" value={fmt(summary?.payments_today_amount)} color="success.main" />
        <StatCard label="Dépenses du jour" value={fmt(summary?.expenses_today_amount)} color="error.main" />
        <StatCard label="Solde caisse" value={fmt(caisseTotal)} />
        <StatCard label="Solde banque" value={fmt(banqueTotal)} />
        <StatCard label="Recettes du mois" value={fmt(summary?.payments_month_amount)} color="success.main" />
        <StatCard label="Dépenses du mois" value={fmt(summary?.expenses_month_amount)} color="error.main" />
        {summary?.payments_pending_count > 0 && (
          <StatCard label="Paiements en attente" value={summary.payments_pending_count} color="warning.main" />
        )}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Paiements en attente
            </Typography>
            <Stack divider={<Divider />}>
              {pending.map((p) => (
                <Stack key={p.id} direction="row" sx={{ alignItems: "center", gap: 1.5, py: 1.5 }}>
                  <PaymentsIcon color="warning" fontSize="small" />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {p.student?.fullname} — {p.fee_structure?.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.payment_method?.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="warning.main">
                    {fmt(p.amount)}
                  </Typography>
                </Stack>
              ))}
              {pending.length === 0 && (
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
              Répartition des dépenses (mois)
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([name, amount]) => (
                  <Box key={name}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {fmt(amount)}
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={(amount / maxCategoryAmount) * 100} sx={{ height: 7, borderRadius: 4 }} />
                  </Box>
                ))}
              {Object.keys(byCategory).length === 0 && (
                <Typography color="text.secondary">Aucune dépense confirmée ce mois-ci.</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename, cols, rows) {
  const lines = [cols.map(csvEscape).join(";")].concat(rows.map((r) => r.map(csvEscape).join(";")));
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AccountingReportsTab({ schoolId }) {
  const [reportKey, setReportKey] = useState("journal-recettes");

  const { data: paymentsData } = useApiGet(schoolId ? `/schools/${schoolId}/payments` : null, {
    params: { status: 1, per_page: 200 },
  });
  const payments = paymentsData?.data ?? [];

  const { data: expensesData } = useApiGet(schoolId ? `/schools/${schoolId}/expenses` : null, {
    params: { status: 1, per_page: 200 },
  });
  const expenses = expensesData?.data ?? [];

  const { data: summary } = useApiGet(schoolId ? `/schools/${schoolId}/dashboard-summary` : null);
  const { data: accountsData } = useApiGet(schoolId ? `/schools/${schoolId}/treasury-accounts` : null);
  const accounts = accountsData ?? [];

  const REPORTS = [
    { key: "journal-recettes", label: "Journal des recettes", icon: <PaymentsIcon fontSize="small" /> },
    { key: "journal-depenses", label: "Journal des dépenses", icon: <PaymentsIcon fontSize="small" /> },
    { key: "situation-caisse", label: "Situation de caisse", icon: <AccountBalanceIcon fontSize="small" /> },
    { key: "situation-bancaire", label: "Situation bancaire", icon: <AccountBalanceIcon fontSize="small" /> },
    { key: "rapport-mensuel", label: "Rapport mensuel", icon: <InboxIcon fontSize="small" /> },
  ];

  function reportData() {
    if (reportKey === "journal-recettes") {
      return {
        cols: ["Reçu", "Date", "Élève", "Catégorie", "Mode", "Montant"],
        rows: payments.map((p) => [
          p.receipt_number ?? "—",
          p.confirmed_at ? new Date(p.confirmed_at).toLocaleDateString("fr-FR") : "",
          p.student?.fullname ?? "",
          p.fee_structure?.label ?? "",
          p.payment_method?.name ?? "",
          fmt(p.amount),
        ]),
      };
    }
    if (reportKey === "journal-depenses") {
      return {
        cols: ["Date", "Catégorie", "Fournisseur", "Mode", "Montant"],
        rows: expenses.map((e) => [
          new Date(e.expense_date).toLocaleDateString("fr-FR"),
          e.expense_category?.name ?? "",
          e.supplier_name ?? "",
          e.payment_method?.name ?? "",
          fmt(e.amount),
        ]),
      };
    }
    if (reportKey === "situation-caisse") {
      return {
        cols: ["Caisse", "Solde actuel"],
        rows: accounts.filter((a) => a.type === "CASH").map((a) => [a.name, fmt(a.balance)]),
      };
    }
    if (reportKey === "situation-bancaire") {
      return {
        cols: ["Compte", "Solde actuel"],
        rows: accounts.filter((a) => a.type === "BANK").map((a) => [a.name, fmt(a.balance)]),
      };
    }
    if (reportKey === "rapport-mensuel") {
      const net = Number(summary?.payments_month_amount ?? 0) - Number(summary?.expenses_month_amount ?? 0);
      return {
        cols: ["Poste", "Montant"],
        rows: [
          ["Recettes du mois", fmt(summary?.payments_month_amount)],
          ["Dépenses du mois", fmt(summary?.expenses_month_amount)],
          ["Résultat net du mois", fmt(net)],
        ],
      };
    }
    return { cols: [], rows: [] };
  }

  const data = reportData();
  const rep = REPORTS.find((r) => r.key === reportKey);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={1}>
          {REPORTS.map((r) => (
            <Paper
              key={r.key}
              variant="outlined"
              sx={{
                p: 2,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                borderColor: reportKey === r.key ? "primary.main" : undefined,
                bgcolor: reportKey === r.key ? "action.selected" : undefined,
              }}
              onClick={() => setReportKey(r.key)}
            >
              {r.icon}
              <Typography variant="body2" fontWeight={600}>
                {r.label}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">{rep?.label}</Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => downloadCsv(`${reportKey}.csv`, data.cols, data.rows)}
          >
            Exporter CSV
          </Button>
        </Stack>
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr">
                {data.cols.map((col) => (
                  <Box
                    component="th"
                    key={col}
                    sx={{ textAlign: "left", p: 1.5, fontSize: 12, color: "text.secondary", borderBottom: 1, borderColor: "divider" }}
                  >
                    {col}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {data.rows.map((row, i) => (
                <Box component="tr" key={i}>
                  {row.map((cell, j) => (
                    <Box component="td" key={j} sx={{ p: 1.5, fontSize: 13.5, borderBottom: 1, borderColor: "divider" }}>
                      {cell}
                    </Box>
                  ))}
                </Box>
              ))}
              {data.rows.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={data.cols.length} sx={{ p: 2, color: "text.secondary" }}>
                    Aucune donnée.
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      </Grid>
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
        <Tab value="recharges-cantine" label="Recharges cantine" />
        <Tab value="tableau-de-bord" label="Tableau de bord" />
        <Tab value="rapports" label="Rapports" />
      </Tabs>

      {tab === "recettes" && <DashboardPaymentsPage embedded />}
      {tab === "depenses" && <DashboardExpensesPage embedded />}
      {tab === "caisse" && <DashboardTreasuryPage embedded typeFilter="CASH" />}
      {tab === "comptes-bancaires" && <DashboardTreasuryPage embedded typeFilter="BANK" />}
      {tab === "recharges-cantine" && <CafeteriaRechargesTab schoolId={schoolId} />}
      {tab === "tableau-de-bord" && <AccountingDashboardTab schoolId={schoolId} />}
      {tab === "rapports" && <AccountingReportsTab schoolId={schoolId} />}
    </Box>
  );
}
