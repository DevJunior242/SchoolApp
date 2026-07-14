import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { motion } from 'motion/react';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link as RouterLink, useParams } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

export default function DashboardTimetablePage() {
  const { user } = useAuth();
  const { classId } = useParams();
  const schoolId = user.current_school_id;

  const [schoolClass, setSchoolClass] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ class_subject_teacher_id: '', day_of_week: '', start_time: '', end_time: '', room: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadSlots() {
    const response = await api.get(`/schools/${schoolId}/classes/${classId}/timetable`);
    setSlots(response.data);
  }

  useEffect(() => {
    setLoadError(null);
    Promise.all([
      api
        .get(`/schools/${schoolId}/classes`, { params: { search: '', per_page: 1000 } })
        .then((r) => setSchoolClass(r.data.data.find((c) => c.id === classId))),
      loadSlots(),
    ])
      .catch((err) => setLoadError(err.response?.data?.message || "Impossible de charger l'emploi du temps."))
      .finally(() => setLoading(false));
  }, [schoolId, classId]);

  function closeModal() {
    setOpen(false);
    setForm({ class_subject_teacher_id: '', day_of_week: '', start_time: '', end_time: '', room: '' });
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/classes/${classId}/timetable`, form);
      await loadSlots();
      closeModal();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : 'Impossible de créer ce créneau.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(slotId) {
    await api.delete(`/schools/${schoolId}/classes/${classId}/timetable/${slotId}`);
    await loadSlots();
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <Box sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Button component={RouterLink} to="/dashboard/classes" sx={{ mb: 2 }}>
        ← Retour aux classes
      </Button>

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Emploi du temps — {schoolClass?.name}
          </Typography>
          <Typography color="text.secondary">{schoolClass?.level?.name}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Ajouter un créneau
        </Button>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {DAYS.map((day) => (
          <Grid key={day.value} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {day.label}
            </Typography>
            <Stack spacing={1}>
              {slots
                .filter((s) => s.day_of_week === day.value)
                .map((slot, i) => (
                  <motion.div key={slot.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {slot.class_subject_teacher.subject.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                              {slot.class_subject_teacher.teacher.fullname}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                              {slot.room ? ` · ${slot.room}` : ''}
                            </Typography>
                          </Box>
                          <IconButton size="small" onClick={() => handleDelete(slot.id)}>
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              {slots.filter((s) => s.day_of_week === day.value).length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  —
                </Typography>
              )}
            </Stack>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={closeModal} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter un créneau</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              select
              label="Matière · Professeur"
              value={form.class_subject_teacher_id}
              onChange={(e) => setForm((prev) => ({ ...prev, class_subject_teacher_id: e.target.value }))}
              required
              fullWidth
            >
              {(schoolClass?.class_subject_teachers ?? []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.subject.name} · {a.teacher.fullname}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Jour"
              value={form.day_of_week}
              onChange={(e) => setForm((prev) => ({ ...prev, day_of_week: e.target.value }))}
              required
              fullWidth
            >
              {DAYS.map((d) => (
                <MenuItem key={d.value} value={d.value}>
                  {d.label}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Début"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
              />
              <TextField
                label="Fin"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
              />
            </Stack>
            <TextField
              label="Salle"
              value={form.room}
              onChange={(e) => setForm((prev) => ({ ...prev, room: e.target.value }))}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeModal}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
