import { useEffect, useState } from 'react';
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
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_LABELS = {
  0: { label: 'Absent', color: 'error' },
  1: { label: 'Présent', color: 'success' },
  2: { label: 'Retard', color: 'warning' },
};

const JUSTIFICATION_LABELS = {
  0: { label: 'Non justifié', color: 'default' },
  1: { label: 'En attente de validation', color: 'warning' },
  2: { label: 'Justifié', color: 'success' },
  3: { label: 'Justification rejetée', color: 'error' },
};

export default function ParentAttendancePage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [justifyTarget, setJustifyTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    api
      .get(`/schools/${schoolId}/my-children`)
      .then((r) => {
        setChildren(r.data);
        if (r.data.length > 0) setSelectedChildId(r.data[0].id);
      })
      .catch((err) => setLoadError(err.response?.data?.message || 'Impossible de charger vos enfants.'))
      .finally(() => setLoading(false));
  }, [schoolId]);

  async function loadAttendances(childId) {
    setLoadError(null);
    try {
      const response = await api.get(`/schools/${schoolId}/students/${childId}/attendances`);
      setAttendances(response.data);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Impossible de charger les absences.');
    }
  }

  useEffect(() => {
    if (!selectedChildId) return;
    loadAttendances(selectedChildId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId]);

  function openJustify(attendance) {
    setJustifyTarget(attendance);
    setReason('');
    setError(null);
  }

  async function handleJustify(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/attendances/${justifyTarget.id}/justify`, { justification_reason: reason });
      await loadAttendances(selectedChildId);
      setJustifyTarget(null);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : 'Impossible de soumettre cette justification.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (loading) return <p>Chargement...</p>;

  if (children.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucun enfant rattaché à votre compte dans cette école.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Absences de mes enfants
      </Typography>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {children.length > 1 && (
        <Tabs value={selectedChildId} onChange={(_, value) => setSelectedChildId(value)} sx={{ mb: 3 }}>
          {children.map((child) => (
            <Tab key={child.id} value={child.id} label={child.fullname} />
          ))}
        </Tabs>
      )}

      <Stack spacing={1.5}>
        {attendances.map((a) => (
          <Card key={a.id} variant="outlined">
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2">
                  {a.class_subject_teacher.subject.name} · {a.class_subject_teacher.school_class.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {a.date.slice(0, 10)}
                </Typography>
              </Box>
              <Chip label={STATUS_LABELS[a.status].label} color={STATUS_LABELS[a.status].color} size="small" />
              {a.status !== 1 && (
                <Chip label={JUSTIFICATION_LABELS[a.justification_status].label} color={JUSTIFICATION_LABELS[a.justification_status].color} size="small" variant="outlined" />
              )}
              {a.status !== 1 && (a.justification_status === 0 || a.justification_status === 3) && (
                <Button size="small" onClick={() => openJustify(a)}>
                  Justifier
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {attendances.length === 0 && <Typography color="text.secondary">Aucune absence enregistrée pour l'instant.</Typography>}
      </Stack>

      <Dialog open={Boolean(justifyTarget)} onClose={() => setJustifyTarget(null)} fullWidth maxWidth="xs">
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Justifier l'absence
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" id="justify-form" onSubmit={handleJustify}>
            <TextField
              label="Motif"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              fullWidth
              multiline
              minRows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setJustifyTarget(null)}>Annuler</Button>
          <Button type="submit" form="justify-form" variant="contained" disabled={submitting}>
            {submitting ? 'Envoi...' : 'Soumettre'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
