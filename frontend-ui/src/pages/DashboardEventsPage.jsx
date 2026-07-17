import { useState } from 'react';
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
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { motion } from 'motion/react';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';
import { useSchools } from '../hooks/useSchools.js';

const MANAGER_ROLE_SLUGS = ['directeur', 'censeur', 'secretaire'];

const TYPE_OPTIONS = [
  { value: 1, label: 'Réunion' },
  { value: 2, label: 'Examen' },
  { value: 3, label: 'Sortie' },
  { value: 4, label: 'Jour férié' },
  { value: 5, label: 'Remise de bulletins' },
  { value: 6, label: 'Autre' },
];

const TYPE_LABELS = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]));

function emptyForm() {
  return { title: '', description: '', type: '', class_id: '', start_at: '', end_at: '', location: '' };
}

export default function DashboardEventsPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { schoolUsers } = useSchools();
  const currentRole = schoolUsers.find((su) => su.school.id === schoolId)?.role?.slug;
  const canManage = MANAGER_ROLE_SLUGS.includes(currentRole);

  const { data: events, loading, error, reload } = useApiGet(schoolId ? `/schools/${schoolId}/events` : null);
  const { data: classesData } = useApiGet(schoolId ? `/schools/${schoolId}/classes` : null, {
    params: { per_page: 1000 },
    enabled: canManage,
  });
  const classes = classesData?.data ?? [];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function closeModal() {
    setOpen(false);
    setForm(emptyForm());
    setFormError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/events`, { ...form, class_id: form.class_id || null });
      await reload();
      closeModal();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setFormError(messages ? Object.values(messages).flat().join(' ') : "Impossible de créer cet événement.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(eventId) {
    await api.delete(`/schools/${schoolId}/events/${eventId}`);
    await reload();
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Événements
          </Typography>
          <Typography color="text.secondary">Réunions, examens, sorties et autres événements de l'école.</Typography>
        </Box>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Ajouter un événement
          </Button>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          Chargement...
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          {(events ?? []).map((ev, i) => (
            <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}>
              <Card variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle1">{ev.title}</Typography>
                      <Chip label={TYPE_LABELS[ev.type]} size="small" variant="outlined" />
                      {ev.school_class && <Chip label={ev.school_class.name} size="small" color="primary" />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(ev.start_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </Typography>
                    {ev.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {ev.description}
                      </Typography>
                    )}
                  </Box>
                  {canManage && (
                    <IconButton size="small" onClick={() => handleDelete(ev.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {(events ?? []).length === 0 && <Typography color="text.secondary">Aucun événement pour l'instant.</Typography>}
        </Stack>
      )}

      <Dialog open={open} onClose={closeModal} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter un événement</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Titre"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              required
              fullWidth
            >
              {TYPE_OPTIONS.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Classe concernée"
              value={form.class_id}
              onChange={(e) => setForm((prev) => ({ ...prev, class_id: e.target.value }))}
              fullWidth
              helperText="Laissez vide pour un événement concernant toute l'école"
            >
              <MenuItem value="">Toute l'école</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Début"
              type="datetime-local"
              value={form.start_at}
              onChange={(e) => setForm((prev) => ({ ...prev, start_at: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              required
              fullWidth
            />
            <TextField
              label="Fin (optionnel)"
              type="datetime-local"
              value={form.end_at}
              onChange={(e) => setForm((prev) => ({ ...prev, end_at: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Lieu (optionnel)"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description (optionnel)"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeModal}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Création...' : 'Créer'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
