import { useEffect, useState } from 'react';
import {
  Alert,
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
} from '@mui/material';
import { motion } from 'motion/react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import api from '../api/axios.jsx';

const EVALUATION_TYPES = [
  { value: 'interrogation', label: 'Interrogation', coefficient: 1 },
  { value: 'devoir', label: 'Devoir', coefficient: 1 },
  { value: 'composition', label: 'Composition', coefficient: 2 },
  { value: 'examen', label: 'Examen', coefficient: 3 },
];

const emptyForm = {
  student_id: '',
  evaluation_type: '',
  title: '',
  score: '',
  max_score: '20',
  coefficient: '',
  graded_at: new Date().toISOString().slice(0, 10),
};

export default function GradeEntryPage() {
  const { assignmentId } = useParams();
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadGrades() {
    const response = await api.get(`/assignments/${assignmentId}/grades`);
    setGrades(response.data);
  }

  useEffect(() => {
    Promise.all([
      api.get(`/assignments/${assignmentId}/students`).then((r) => setStudents(r.data)),
      loadGrades(),
    ]).finally(() => setLoading(false));
  }, [assignmentId]);

  function handleTypeChange(value) {
    const type = EVALUATION_TYPES.find((t) => t.value === value);
    setForm((prev) => ({ ...prev, evaluation_type: value, coefficient: String(type?.coefficient ?? 1) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/assignments/${assignmentId}/grades`, form);
      await loadGrades();
      setForm((prev) => ({ ...emptyForm, student_id: prev.student_id }));
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'ajouter cette note.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <Box>
      <Button component={RouterLink} to="/dashboard/my-assignments" sx={{ mb: 2 }}>
        ← Retour à mes cours
      </Button>

      <Typography variant="h5" fontWeight={700} gutterBottom>
        Saisie des notes
      </Typography>

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
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Élève"
                value={form.student_id}
                onChange={(e) => setForm((prev) => ({ ...prev, student_id: e.target.value }))}
                required
                fullWidth
              >
                {students.map((s) => (
                  <MenuItem key={s.id} value={s.student_id}>
                    {s.student.fullname}
                  </MenuItem>
                ))}
              </TextField>
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
                    {t.label} (coef. {t.coefficient})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Titre (optionnel)"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Note"
                  type="number"
                  value={form.score}
                  onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Barème"
                  type="number"
                  value={form.max_score}
                  onChange={(e) => setForm((prev) => ({ ...prev, max_score: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Coef."
                  type="number"
                  value={form.coefficient}
                  onChange={(e) => setForm((prev) => ({ ...prev, coefficient: e.target.value }))}
                  fullWidth
                />
              </Stack>
              <TextField
                label="Date"
                type="date"
                value={form.graded_at}
                onChange={(e) => setForm((prev) => ({ ...prev, graded_at: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? 'Ajout...' : 'Ajouter la note'}
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
              <motion.div key={g.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <Card variant="outlined">
                  <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2">{g.student.fullname}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {g.title || g.evaluation_type} · {g.graded_at}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={g.evaluation_type} size="small" variant="outlined" />
                      <Typography variant="h6">
                        {g.score}/{g.max_score}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {grades.length === 0 && <Typography color="text.secondary">Aucune note saisie pour l'instant.</Typography>}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
