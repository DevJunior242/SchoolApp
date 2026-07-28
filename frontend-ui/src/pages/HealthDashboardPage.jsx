import { Alert, Box, Card, CardContent, Grid, Typography } from "@mui/material";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MedicationIcon from "@mui/icons-material/Medication";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import VaccinesIcon from "@mui/icons-material/Vaccines";
import EmergencyIcon from "@mui/icons-material/Emergency";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";

export default function HealthDashboardPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const {
    data: stats,
    loading,
    error,
  } = useApiGet(schoolId ? `/schools/${schoolId}/health/summary` : null);

  if (loading)
    return <Typography color="text.secondary">Chargement...</Typography>;

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {error}
      </Alert>
    );
  }

  const tiles = [
    {
      icon: <LocalHospitalIcon color="primary" />,
      label: "Visites aujourd'hui",
      value: stats?.visits_today || 0,
    },
    {
      icon: <MedicationIcon color="primary" />,
      label: "Élèves sous traitement",
      value: stats?.students_under_treatment || 0,
    },
    {
      icon: <WarningAmberIcon color="primary" />,
      label: "Élèves allergiques",
      value: stats?.allergic_students || 0,
    },
    {
      icon: <VaccinesIcon color="primary" />,
      label: "Vaccins à renouveler (30 j)",
      value: stats?.vaccines_due_soon || 0,
    },
    {
      icon: <EmergencyIcon color="primary" />,
      label: "Cas d'urgence enregistrés",
      value: stats?.emergencies_recorded || 0,
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Tableau de bord santé
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Suivi santé des élèves de l'école active.
      </Typography>

      <Grid container spacing={3}>
        {tiles.map((tile) => (
          <Grid key={tile.label} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ mb: 1 }}>{tile.icon}</Box>
                <Typography variant="h4" fontWeight={700}>
                  {tile.value}
                </Typography>
                <Typography color="text.secondary">{tile.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
