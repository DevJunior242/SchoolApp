import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Navigate } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

const STATUS_LABELS = {
  0: { label: 'Disponible', color: 'success' },
  1: { label: 'Utilisée', color: 'default' },
  2: { label: 'Révoquée', color: 'error' },
};

export default function SuperAdminActivationKeysPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApiGet('/admin/activation-keys', {
    enabled: user?.role?.slug === 'superadmin',
  });
  const keys = data?.data ?? [];
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  async function handleGenerate() {
    setGenerateError(null);
    setGenerating(true);
    try {
      await api.post('/admin/activation-keys');
      await reload();
    } catch {
      setGenerateError("Impossible de générer une clé.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy(key) {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  if (user?.role?.slug !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Clés d'activation
          </Typography>
          <Typography color="text.secondary">
            Générez une clé et transmettez-la à un client pour qu'il puisse créer son école.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleGenerate} disabled={generating}>
          {generating ? 'Génération...' : 'Générer une clé'}
        </Button>
      </Stack>

      {(error || generateError) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || generateError}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          Chargement...
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          {keys.map((k) => (
            <Card key={k.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{k.key}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Créée le {new Date(k.created_at).toLocaleDateString('fr-FR')}
                    {k.school ? ` · Utilisée par ${k.school.name}` : ''}
                  </Typography>
                </Box>
                <Chip label={STATUS_LABELS[k.status].label} color={STATUS_LABELS[k.status].color} size="small" />
                <IconButton size="small" onClick={() => handleCopy(k.key)} disabled={k.status !== 0}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
                {copiedKey === k.key && (
                  <Typography variant="caption" color="success.main">
                    Copié
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
          {keys.length === 0 && <Typography color="text.secondary">Aucune clé générée pour l'instant.</Typography>}
        </Stack>
      )}
    </Box>
  );
}
