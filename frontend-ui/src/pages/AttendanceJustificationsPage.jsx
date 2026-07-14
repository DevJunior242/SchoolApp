import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AttendanceJustificationsPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;

  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actingId, setActingId] = useState(null);

  async function loadPending() {
    setError(null);
    try {
      const response = await api.get(`/schools/${schoolId}/attendances/pending-justifications`);
      setPending(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les justifications en attente.');
    }
  }

  useEffect(() => {
    if (!schoolId) return;
    loadPending().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  async function handleDecision(attendance, decision) {
    setActingId(attendance.id);
    try {
      await api.post(`/schools/${schoolId}/attendances/${attendance.id}/${decision}-justification`);
      await loadPending();
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de traiter cette justification.');
    } finally {
      setActingId(null);
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

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Justifications d'absences
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Absences et retards en attente de validation par le personnel.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {pending.map((a) => (
          <Card key={a.id} variant="outlined">
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2">
                  {a.student.fullname} — {a.class_subject_teacher.subject.name} · {a.class_subject_teacher.school_class.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {a.date.slice(0, 10)} · {a.status === 0 ? 'Absent' : 'Retard'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Motif : {a.justification_reason}
                </Typography>
              </Box>
              <Chip label="En attente" color="warning" size="small" />
              <Button
                size="small"
                color="success"
                variant="outlined"
                disabled={actingId === a.id}
                onClick={() => handleDecision(a, 'approve')}
              >
                Justifier
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={actingId === a.id}
                onClick={() => handleDecision(a, 'reject')}
              >
                Rejeter
              </Button>
            </CardContent>
          </Card>
        ))}
        {pending.length === 0 && <Typography color="text.secondary">Aucune justification en attente.</Typography>}
      </Stack>
    </Box>
  );
}
