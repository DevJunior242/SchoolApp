import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

const STATUS_LABELS = {
  0: { label: 'En attente', color: 'warning' },
  1: { label: 'Contacté', color: 'info' },
  2: { label: 'Clôturé', color: 'default' },
};

export default function SuperAdminDemoRequestsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.slug === 'superadmin';
  const { data: requests, page, setPage, lastPage, total, search, setSearch, loading, error, reload } =
    usePaginatedList(isSuperAdmin ? '/admin/demo-requests' : null);
  const [actingId, setActingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleStatusChange(demoRequest, status) {
    setActionError(null);
    setActingId(demoRequest.id);
    try {
      await api.put(`/admin/demo-requests/${demoRequest.id}/status`, { status });
      await reload();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Impossible de mettre à jour cette demande.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Demandes de démo
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Demandes envoyées depuis la homepage ({total}).
      </Typography>

      <TextField
        label="Rechercher"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 3, maxWidth: 320 }}
        fullWidth
      />

      {(error || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || actionError}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5}>
          {requests.map((demoRequest) => {
            const status = STATUS_LABELS[demoRequest.status] ?? STATUS_LABELS[0];
            return (
              <Card key={demoRequest.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="flex-start" spacing={2} flexWrap="wrap">
                    <Box sx={{ flexGrow: 1, minWidth: 220 }}>
                      <Typography variant="subtitle2">
                        {demoRequest.school_name || 'Établissement non précisé'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[demoRequest.email, demoRequest.phone].filter(Boolean).join(' · ')} · reçu le{' '}
                        {new Date(demoRequest.created_at).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Box>
                    <Chip label={status.label} color={status.color} size="small" />
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
                    {demoRequest.description}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    {demoRequest.status !== 1 && (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={actingId === demoRequest.id}
                        onClick={() => handleStatusChange(demoRequest, 1)}
                      >
                        Marquer contacté
                      </Button>
                    )}
                    {demoRequest.status !== 2 && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        disabled={actingId === demoRequest.id}
                        onClick={() => handleStatusChange(demoRequest, 2)}
                      >
                        Clôturer
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
          {requests.length === 0 && <Typography color="text.secondary">Aucune demande.</Typography>}
        </Stack>
      )}

      {lastPage > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination count={lastPage} page={page} onChange={(_, value) => setPage(value)} />
        </Stack>
      )}
    </Box>
  );
}
