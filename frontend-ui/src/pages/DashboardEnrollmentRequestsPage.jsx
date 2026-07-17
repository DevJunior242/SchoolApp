import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
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
  const [actingId, setActingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  async function handleDecision(request, decision) {
    setActionError(null);
    setActingId(request.id);
    try {
      await api.post(`/schools/${schoolId}/enrollment-requests/${request.id}/${decision}`);
      await reload();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Impossible de traiter cette demande.');
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
                  {r.level_wanted ? ` — ${r.level_wanted}` : ''}
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
                    onClick={() => handleDecision(r, 'accept')}
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
    </Box>
  );
}
