import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";

const STATUS_LABELS = {
  no_stop_assigned: {
    label: "Pas encore affecté à un arrêt de bus",
    color: "default",
  },
  no_active_trip: { label: "Aucun trajet en cours", color: "default" },
  en_route: { label: "En route", color: "primary" },
  passed: { label: "Déjà passé à cet arrêt", color: "success" },
};

export default function ParentBusTrackingPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data, loading, error } = useApiGet(
    schoolId ? `/schools/${schoolId}/my-children-bus` : null,
  );

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (loading)
    return <Typography color="text.secondary">Chargement...</Typography>;

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {error}
      </Alert>
    );
  }

  const children = data ?? [];

  return (
    <Box sx={{ maxWidth: 600, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Bus scolaire
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Le temps d'arrivée est une estimation à vol d'oiseau, pas un compte à
        rebours précis.
      </Typography>

      <Stack spacing={2}>
        {children.map((child) => {
          const status =
            STATUS_LABELS[child.status] ?? STATUS_LABELS.no_active_trip;

          return (
            <Card key={child.student?.id} variant="outlined">
              <CardContent>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <DirectionsBusIcon color="action" />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1">
                      {child.student?.fullname}
                    </Typography>
                    {child.bus && (
                      <Typography variant="body2" color="text.secondary">
                        {child.bus.label} — arrêt « {child.stop?.label} »
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={status.label}
                    color={status.color}
                    size="small"
                  />
                </Stack>

                {child.status === "en_route" && child.eta_minutes !== null && (
                  <Typography variant="body2">
                    Arrivée estimée dans environ{" "}
                    <strong>{child.eta_minutes} minute(s)</strong> (
                    {child.distance_km} km)
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
        {children.length === 0 && (
          <Typography color="text.secondary">
            Aucun enfant rattaché à votre compte dans cette école.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
