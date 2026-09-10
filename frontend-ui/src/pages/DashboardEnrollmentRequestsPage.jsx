import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

const STATUS_LABELS = {
  0: { label: 'En attente', color: 'warning' },
  1: { label: 'Acceptée', color: 'success' },
  2: { label: 'Refusée', color: 'default' },
};

export default function DashboardEnrollmentRequestsPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data, loading, error, reload } = useApiGet(
    schoolId ? `/schools/${schoolId}/enrollment-requests` : null
  );
  const requests = data?.data ?? [];
  const { data: classesData } = useApiGet(
    schoolId ? `/schools/${schoolId}/classes` : null,
    { params: { per_page: 100 } },
  );
  const classes = classesData?.data ?? [];
  const [actingId, setActingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [admissionRequest, setAdmissionRequest] = useState(null);
  const [admissionForm, setAdmissionForm] = useState({
    class_id: '', child_birthdate: '', gender: '', parent_email: '', parent_relationship: 'tuteur',
  });

  async function handleDecision(request, decision) {
    let payload;
    if (decision === 'reject') {
      const rejectionReason = window.prompt('Motif du refus (optionnel) :');
      if (rejectionReason === null) return;
      payload = { rejection_reason: rejectionReason.trim() || null };
    }

    setActionError(null);
    setActingId(request.id);
    try {
      await api.post(`/schools/${schoolId}/enrollment-requests/${request.id}/${decision}`, payload);
      await reload();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Impossible de traiter cette demande.');
    } finally {
      setActingId(null);
    }
  }

  function openAdmission(request) {
    setActionError(null);
    setAdmissionRequest(request);
    setAdmissionForm({
      class_id: '',
      child_birthdate: request.child_birthdate ? request.child_birthdate.slice(0, 10) : '',
      gender: '',
      parent_email: request.parent_email || '',
      parent_relationship: 'tuteur',
    });
  }

  async function confirmAdmission(event) {
    event.preventDefault();
    setActionError(null);
    setActingId(admissionRequest.id);
    try {
      await api.post(
        `/schools/${schoolId}/enrollment-requests/${admissionRequest.id}/accept`,
        admissionForm,
      );
      setAdmissionRequest(null);
      await reload();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setActionError(messages ? Object.values(messages).flat().join(' ') : err.response?.data?.message || 'Impossible d’admettre cet élève.');
    } finally {
      setActingId(null);
    }
  }

  function classLabel(schoolClass) {
    return [schoolClass.level?.section?.name, schoolClass.level?.name, schoolClass.name]
      .filter(Boolean)
      .join(' · ');
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
        Demandes d'inscription
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Demandes de pré-inscription envoyées depuis la homepage par des parents ou élèves.
      </Typography>

      {(error || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || actionError}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {requests.map((r) => (
          <Card key={r.id} variant="outlined">
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flexGrow: 1, minWidth: 220 }}>
                <Typography variant="subtitle2">
                  {r.child_fullname}
                  {r.level?.name ? ` — ${r.level.section?.name ? `${r.level.section.name} · ` : ''}${r.level.name}` : ''}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Par {r.parent_fullname}
                  {r.parent_phone ? ` · ${r.parent_phone}` : ''}
                  {r.parent_email ? ` · ${r.parent_email}` : ''}
                </Typography>
                {r.message && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {r.message}
                  </Typography>
                )}
              </Box>
              <Chip label={STATUS_LABELS[r.status].label} color={STATUS_LABELS[r.status].color} size="small" />
              {r.status === 0 && (
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    color="success"
                    variant="outlined"
                    disabled={actingId === r.id}
                    onClick={() => openAdmission(r)}
                  >
                    Accepter
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={actingId === r.id}
                    onClick={() => handleDecision(r, 'reject')}
                  >
                    Refuser
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        ))}
        {requests.length === 0 && (
          <Typography color="text.secondary">Aucune demande d'inscription pour l'instant.</Typography>
        )}
      </Stack>

      <Dialog open={Boolean(admissionRequest)} onClose={() => setAdmissionRequest(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={confirmAdmission}>
          <DialogTitle>Admettre {admissionRequest?.child_fullname}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Alert severity="info">
              La section de l’élève sera déterminée par la classe choisie.
            </Alert>
            <TextField select label="Classe" value={admissionForm.class_id} onChange={(event) => setAdmissionForm((form) => ({ ...form, class_id: event.target.value }))} required fullWidth>
              {classes.map((schoolClass) => (
                <MenuItem key={schoolClass.id} value={schoolClass.id}>{classLabel(schoolClass)}</MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Date de naissance" type="date" value={admissionForm.child_birthdate} onChange={(event) => setAdmissionForm((form) => ({ ...form, child_birthdate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} required fullWidth />
              <TextField select label="Genre" value={admissionForm.gender} onChange={(event) => setAdmissionForm((form) => ({ ...form, gender: event.target.value }))} required fullWidth>
                <MenuItem value="M">Masculin</MenuItem>
                <MenuItem value="F">Féminin</MenuItem>
              </TextField>
            </Stack>
            <TextField label="Email du parent" type="email" value={admissionForm.parent_email} onChange={(event) => setAdmissionForm((form) => ({ ...form, parent_email: event.target.value }))} helperText="Requis seulement si le parent n’a pas déjà un compte avec ce téléphone." fullWidth />
            <TextField select label="Lien de parenté" value={admissionForm.parent_relationship} onChange={(event) => setAdmissionForm((form) => ({ ...form, parent_relationship: event.target.value }))} required fullWidth>
              <MenuItem value="pere">Père</MenuItem>
              <MenuItem value="mere">Mère</MenuItem>
              <MenuItem value="tuteur">Tuteur / Tutrice</MenuItem>
              <MenuItem value="autre">Autre</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAdmissionRequest(null)}>Annuler</Button>
            <Button type="submit" color="success" variant="contained" disabled={actingId === admissionRequest?.id || classes.length === 0}>
              {actingId === admissionRequest?.id ? 'Admission...' : 'Créer l’inscription'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
