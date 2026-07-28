import { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "motion/react";
import { Link as RouterLink, useParams } from "react-router-dom";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";

const EVALUATION_TYPES = [
  { value: "interrogation", label: "Interrogation" },
  { value: "devoir", label: "Devoir" },
  { value: "composition", label: "Composition" },
  { value: "examen", label: "Examen" },
];

function emptyForm(seasonId = "") {
  return {
    student_id: "",
    season_id: seasonId,
    evaluation_type: "",
    title: "",
    score: "",
    max_score: "20",
    graded_at: new Date().toISOString().slice(0, 10),
  };
}

/** La saison dont la période de dates englobe aujourd'hui, sinon la première. */
function currentSeason(seasons) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    seasons.find(
      (s) =>
        s.start_date &&
        s.end_date &&
        s.start_date.slice(0, 10) <= today &&
        today <= s.end_date.slice(0, 10),
    ) ?? seasons[0]
  );
}

export default function GradeEntryPage() {
  const { assignmentId } = useParams();
  const { user } = useAuth();
  const { data: seasons } = useApiGet(
    user.current_school_id
      ? `/schools/${user.current_school_id}/seasons`
      : null,
  );
  const [assignment, setAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [seasonInitialized, setSeasonInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Pré-sélectionne la saison en cours dès qu'elle est connue, une seule
  // fois (sinon un refetch écraserait un choix déjà fait par l'utilisateur).
  if (seasons && seasons.length > 0 && !seasonInitialized) {
    setForm((prev) => ({
      ...prev,
      season_id: currentSeason(seasons)?.id ?? "",
    }));
    setSeasonInitialized(true);
  }

  async function loadGrades() {
    const response = await api.get(`/assignments/${assignmentId}/grades`);
    setGrades(response.data);
  }

  useEffect(() => {
    async function load() {
      setLoadError(null);
      try {
        await Promise.all([
          api
            .get(`/assignments/${assignmentId}`)
            .then((r) => setAssignment(r.data)),
          api
            .get(`/assignments/${assignmentId}/students`)
            .then((r) => setStudents(r.data)),
          loadGrades(),
        ]);
      } catch (err) {
        setLoadError(
          err.response?.data?.message || "Impossible de charger ce cours.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  function handleTypeChange(value) {
    setForm((prev) => ({ ...prev, evaluation_type: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/assignments/${assignmentId}/grades`, form);
      await loadGrades();
      setForm((prev) => ({
        ...emptyForm(),
        student_id: prev.student_id,
        season_id: prev.season_id,
      }));
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible d'ajouter cette note.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/dashboard/my-assignments"
        sx={{ mb: 2 }}
      >
        ← Retour à mes cours
      </Button>

      <Typography variant="h5" fontWeight={700} gutterBottom>
        Saisie des notes
      </Typography>
      {assignment && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {assignment.subject.name} · {assignment.school_class.name}
          {assignment.school_class.level
            ? ` (${assignment.school_class.level.name})`
            : ""}
        </Typography>
      )}

      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadError}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ajouter une note
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                select
                label="Trimestre / semestre"
                value={form.season_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, season_id: e.target.value }))
                }
                helperText={
                  !seasons || seasons.length === 0
                    ? "Aucune période scolaire configurée pour cette école."
                    : ""
                }
                disabled={!seasons || seasons.length === 0}
                required
                fullWidth
              >
                {(seasons ?? []).map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
              <Autocomplete
                options={students}
                getOptionLabel={(s) => s.student.fullname}
                isOptionEqualToValue={(option, value) =>
                  option.student_id === value.student_id
                }
                value={
                  students.find((s) => s.student_id === form.student_id) ?? null
                }
                onChange={(_, newValue) =>
                  setForm((prev) => ({
                    ...prev,
                    student_id: newValue?.student_id ?? "",
                  }))
                }
                renderInput={(params) => (
                  <TextField {...params} label="Élève" required />
                )}
                noOptionsText="Aucun élève trouvé"
                fullWidth
              />
              <TextField
                select
                label="Type d'évaluation"
                value={form.evaluation_type}
                onChange={(e) => handleTypeChange(e.target.value)}
                required
                fullWidth
              >
                {EVALUATION_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Titre (optionnel)"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Note"
                  type="number"
                  value={form.score}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, score: e.target.value }))
                  }
                  required
                  fullWidth
                />
                <TextField
                  label="Barème"
                  type="number"
                  value={form.max_score}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, max_score: e.target.value }))
                  }
                  fullWidth
                />
              </Stack>
              <TextField
                label="Date"
                type="date"
                value={form.graded_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, graded_at: e.target.value }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? "Ajout..." : "Ajouter la note"}
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h6" gutterBottom>
            Notes saisies
          </Typography>
          <Stack spacing={1.5}>
            {grades.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card variant="outlined">
                  <CardContent
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">
                        {g.student.fullname}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {g.title || g.evaluation_type} ·{" "}
                        {new Date(g.graded_at).toLocaleDateString("fr-FR")}
                        {g.season ? ` · ${g.season.label}` : ""}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={g.evaluation_type}
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="h6">
                        {g.score}/{g.max_score}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {grades.length === 0 && (
              <Typography color="text.secondary">
                Aucune note saisie pour l'instant.
              </Typography>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
