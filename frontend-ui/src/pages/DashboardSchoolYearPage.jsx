import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "—";
}

function toInputDate(d) {
  return d ? d.slice(0, 10) : "";
}

export default function DashboardSchoolYearPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const {
    data: years,
    loading,
    error,
    reload,
  } = useApiGet(schoolId ? `/schools/${schoolId}/school-years` : null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const [editingSeason, setEditingSeason] = useState(null);
  const [seasonForm, setSeasonForm] = useState({
    label: "",
    start_date: "",
    end_date: "",
  });
  const [seasonError, setSeasonError] = useState(null);
  const [seasonSubmitting, setSeasonSubmitting] = useState(false);

  async function handleStartNewYear() {
    setActionError(null);
    setSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/school-years`);
      await reload();
      setConfirmOpen(false);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setActionError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible de démarrer une nouvelle année scolaire.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openEditSeason(season) {
    setEditingSeason(season);
    setSeasonForm({
      label: season.label,
      start_date: toInputDate(season.start_date),
      end_date: toInputDate(season.end_date),
    });
    setSeasonError(null);
  }

  async function handleSaveSeason(e) {
    e.preventDefault();
    setSeasonError(null);
    setSeasonSubmitting(true);
    try {
      await api.put(
        `/schools/${schoolId}/seasons/${editingSeason.id}`,
        seasonForm,
      );
      await reload();
      setEditingSeason(null);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setSeasonError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible de modifier cette période.",
      );
    } finally {
      setSeasonSubmitting(false);
    }
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (loading) return <p>Chargement...</p>;

  const currentYear = (years ?? []).find((y) => y.is_current);
  const pastYears = (years ?? []).filter((y) => !y.is_current);

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Année scolaire
          </Typography>
          <Typography color="text.secondary">
            Découpage en trimestres ou semestres réglable dans Paramètres.
            Ajustez les dates de chaque période pour qu'elles correspondent à
            votre calendrier réel.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setConfirmOpen(true)}
        >
          Démarrer une nouvelle année
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {currentYear ? (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">{currentYear.label}</Typography>
              <Chip label="Année en cours" color="primary" size="small" />
            </Stack>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Du {formatDate(currentYear.start_date)} au{" "}
              {formatDate(currentYear.end_date)}
            </Typography>
            <Stack spacing={1}>
              {currentYear.seasons.map((s) => (
                <Stack
                  key={s.id}
                  direction="row"
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 1.5,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2">{s.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Du {formatDate(s.start_date)} au {formatDate(s.end_date)}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<EditIcon fontSize="small" />}
                    onClick={() => openEditSeason(s)}
                  >
                    Modifier
                  </Button>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Aucune année scolaire en cours.
        </Alert>
      )}

      {pastYears.length > 0 && (
        <>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1.5 }}
          >
            Années précédentes
          </Typography>
          <Stack spacing={1.5}>
            {pastYears.map((y) => (
              <Card key={y.id} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1">{y.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Du {formatDate(y.start_date)} au {formatDate(y.end_date)} ·{" "}
                    {y.seasons?.length} période(s)
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Démarrer une nouvelle année scolaire ?
          </Typography>
          <Typography color="text.secondary">
            L'année en cours ({currentYear?.label}) sera archivée. Les classes
            et élèves ne sont pas reportés automatiquement : vous recréerez les
            classes de la nouvelle année comme d'habitude.
          </Typography>
          {actionError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {actionError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleStartNewYear}
            disabled={submitting}
          >
            {submitting ? "Démarrage..." : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingSeason)}
        onClose={() => setEditingSeason(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Modifier {editingSeason?.label}</DialogTitle>
        <Box component="form" onSubmit={handleSaveSeason}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {seasonError && <Alert severity="error">{seasonError}</Alert>}
            <TextField
              label="Libellé"
              value={seasonForm.label}
              onChange={(e) =>
                setSeasonForm((prev) => ({ ...prev, label: e.target.value }))
              }
              required
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Début"
                type="date"
                value={seasonForm.start_date}
                onChange={(e) =>
                  setSeasonForm((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
              />
              <TextField
                label="Fin"
                type="date"
                value={seasonForm.end_date}
                onChange={(e) =>
                  setSeasonForm((prev) => ({
                    ...prev,
                    end_date: e.target.value,
                  }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditingSeason(null)}>Annuler</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={seasonSubmitting}
            >
              {seasonSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
