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
import { asArray } from "../utils/apiData.js";

const STATUS_LABELS = {
  no_stop_assigned: {
    label: "Pas encore affecté à un arrêt",
    color: "default",
  },
  no_active_trip: { label: "Aucun trajet en cours", color: "default" },
  en_route: { label: "En route", color: "primary" },
  passed: { label: "Déjà passé à cet arrêt", color: "success" },
};

export default function StudentBusTrackingPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const { data, loading, error } = useApiGet(
    schoolId ? `/schools/${schoolId}/my-bus` : null,
  );
  const entries = asArray(data);

  if (!schoolId) return <Alert severity="info">Aucune école active.</Alert>;
  if (loading)
    return <Typography color="text.secondary">Chargement...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  const entry = entries[0];
  const status = STATUS_LABELS[entry?.status] ?? STATUS_LABELS.no_stop_assigned;

  return (
    <Box sx={{ maxWidth: 600, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Mon bus scolaire
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Suivez votre bus et votre arrêt affecté.
      </Typography>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <DirectionsBusIcon color="primary" />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {entry?.bus?.label ?? "Aucun bus affecté"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {entry?.stop?.label
                  ? `Arrêt : ${entry.stop.label}`
                  : "Aucun arrêt affecté"}
              </Typography>
            </Box>
            <Chip label={status.label} color={status.color} size="small" />
          </Stack>
          {entry?.status === "en_route" && entry.eta_minutes != null && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Arrivée estimée dans environ{" "}
              <strong>{entry.eta_minutes} minute(s)</strong>.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
