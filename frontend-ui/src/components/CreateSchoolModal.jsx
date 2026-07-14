import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

function emptyForm() {
  return { name: '', country_id: '' };
}

/**
 * Modal de création d'école, réutilisée depuis la homepage (visible à
 * tous) et depuis "Mes écoles". Si le visiteur n'est pas connecté, on
 * l'oriente vers inscription/connexion plutôt que d'afficher le formulaire.
 */
export default function CreateSchoolModal({ open, onClose, onCreated, redirectToDashboard = true }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { data: countries } = useApiGet('/countries', { enabled: open && Boolean(user) });
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setForm(emptyForm());
    setError(null);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/schools', form);
      await refreshUser();
      onCreated?.();
      handleClose();
      if (redirectToDashboard) navigate('/dashboard');
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : "Impossible de créer l'école.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Créer une école</DialogTitle>

      {!user ? (
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Connectez-vous ou créez un compte pour créer votre école.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button component={RouterLink} to="/register" variant="contained" onClick={handleClose} fullWidth>
              Créer un compte
            </Button>
            <Button component={RouterLink} to="/login" variant="outlined" onClick={handleClose} fullWidth>
              Se connecter
            </Button>
          </Stack>
        </DialogContent>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Nom de l'école"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Pays"
              value={form.country_id}
              onChange={(e) => setForm((prev) => ({ ...prev, country_id: e.target.value }))}
              required
              fullWidth
            >
              {(countries ?? []).map((country) => (
                <MenuItem key={country.id} value={country.id}>
                  {country.name}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClose}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Création...' : "Créer l'école"}
            </Button>
          </DialogActions>
        </Box>
      )}
    </Dialog>
  );
}
