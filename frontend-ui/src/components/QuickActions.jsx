import { Button, Paper, Stack, Typography } from "@mui/material";
import AddPersonIcon from "@mui/icons-material/PersonAdd";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PaymentsIcon from "@mui/icons-material/Payments";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SchoolIcon from "@mui/icons-material/School";
import SettingsIcon from "@mui/icons-material/Settings";
import { Link as RouterLink } from "react-router-dom";

const ACTIONS_BY_ROLE = {
  admin: [
    {
      label: "Ajouter un élève",
      to: "/dashboard/students",
      icon: <AddPersonIcon />,
    },
    {
      label: "Ajouter un professeur",
      to: "/dashboard/teachers",
      icon: <SchoolIcon />,
    },
    {
      label: "Voir les paiements",
      to: "/dashboard/payments",
      icon: <PaymentsIcon />,
    },
    { label: "Paramètres", to: "/dashboard/settings", icon: <SettingsIcon /> },
  ],
  comptable: [
    {
      label: "Confirmer les paiements",
      to: "/dashboard/payments",
      icon: <PaymentsIcon />,
    },
    {
      label: "Trésorerie",
      to: "/dashboard/treasury",
      icon: <AccountBalanceWalletIcon />,
    },
    {
      label: "Comptabilité",
      to: "/dashboard/accounting",
      icon: <AssignmentIcon />,
    },
  ],
  parent: [
    {
      label: "Déclarer un paiement",
      to: "/dashboard/my-children-payments",
      icon: <PaymentsIcon />,
    },
    {
      label: "Absences",
      to: "/dashboard/my-children-attendances",
      icon: <EventBusyIcon />,
    },
    {
      label: "Bulletins",
      to: "/dashboard/my-children-bulletins",
      icon: <AssignmentIcon />,
    },
    {
      label: "Cours",
      to: "/dashboard/my-children-courses",
      icon: <MenuBookIcon />,
    },
  ],
  eleve: [
    { label: "Mes cours", to: "/dashboard/my-courses", icon: <MenuBookIcon /> },
    {
      label: "Mon bulletin",
      to: "/dashboard/my-bulletin",
      icon: <AssignmentIcon />,
    },
    {
      label: "Mon emploi du temps",
      to: "/dashboard/my-timetable",
      icon: <ScheduleIcon />,
    },
    {
      label: "Mon portefeuille",
      to: "/dashboard/my-wallet",
      icon: <AccountBalanceWalletIcon />,
    },
  ],
  professeur: [
    { label: "Mes cours", to: "/dashboard/my-courses", icon: <MenuBookIcon /> },
    {
      label: "Saisir les notes",
      to: "/dashboard/assignments",
      icon: <AssignmentIcon />,
    },
    {
      label: "Mon emploi du temps",
      to: "/dashboard/my-timetable",
      icon: <ScheduleIcon />,
    },
  ],
  enseignant: [
    { label: "Mes cours", to: "/dashboard/my-courses", icon: <MenuBookIcon /> },
    {
      label: "Saisir les notes",
      to: "/dashboard/assignments",
      icon: <AssignmentIcon />,
    },
    {
      label: "Mon emploi du temps",
      to: "/dashboard/my-timetable",
      icon: <ScheduleIcon />,
    },
  ],
  rh: [
    {
      label: "Ajouter un employé",
      to: "/dashboard/hr",
      icon: <AddPersonIcon />,
    },
    { label: "Paie", to: "/dashboard/hr/payroll", icon: <PaymentsIcon /> },
    { label: "Congés", to: "/dashboard/hr/leaves", icon: <EventBusyIcon /> },
  ],
};

export default function QuickActions({ role }) {
  const actions = ACTIONS_BY_ROLE[role] ?? [];

  if (actions.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Actions rapides
      </Typography>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        useFlexGap
        flexWrap="wrap"
      >
        {actions.map((action) => (
          <Button
            key={action.to}
            component={RouterLink}
            to={action.to}
            variant="outlined"
            startIcon={action.icon}
            sx={{
              width: { xs: "100%", sm: "auto" },
              minWidth: 0,
              minHeight: 44,
              flex: { sm: "1 1 auto" },
              justifyContent: { xs: "flex-start", sm: "center" },
              borderRadius: 1.5,
              whiteSpace: "normal",
              textAlign: "left",
            }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>
    </Paper>
  );
}
