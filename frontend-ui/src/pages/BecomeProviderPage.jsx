import { useState } from 'react';
import { Alert, Box, Button, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

const PERIOD_LABELS = { 1: 'mois', 2: 'an' };

const CATEGORIES = [
  { value: 1, label: 'Enseignant' },
  { value: 2, label: 'Formateur' },
  { value: 3, label: 'Chauffeur' },
  { value: 4, label: 'Fournisseur' },
  { value: 5, label: 'Imprimeur' },
  { value: 6, label: 'Librairie' },
];

function emptyForm() {
  return { category: '', business_name: '', description: '', country_id: '', city: '', phone: '', email: '' };
}

export default function BecomeProviderPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { data: countries } = useApiGet('/countries', { enabled: Boolean(user) });
  const { data: plans } = useApiGet('/marketplace/plans');

  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.phone.trim() && !form.email.trim()) {
      setError('Indiquez au moins un numéro de téléphone ou un email pour être recontacté.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/marketplace/providers', form);
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Vous devez vérifier votre email avant de vous inscrire comme prestataire. Consultez votre boîte mail.');
        return;
      }
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : err.response?.data?.message || "Impossible d'envoyer l'inscription.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Devenir prestataire
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        Enseignant, formateur, chauffeur, fournisseur, imprimeur, librairie... apparaissez dans l'annuaire consulté
        par les écoles de votre pays.
      </Typography>
      {plans?.length > 0 && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Abonnement :{' '}
          {plans
            .map((plan) => `${Number(plan.amount).toLocaleString()} ${plan.currency} / ${PERIOD_LABELS[plan.period] ?? plan.period}`)
            .join(' ou ')}
          .
        </Typography>
      )}

      {!user ? (
        <Paper variant="outlined" sx={(theme) => ({ p: 4, bgcolor: alpha(theme.palette.text.primary, 0.03) })}>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Connectez-vous ou créez un compte pour vous inscrire comme prestataire.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button component={RouterLink} to="/register" variant="contained" fullWidth>
              Créer un compte
            </Button>
            <Button component={RouterLink} to="/login" variant="outlined" fullWidth>
              Se connecter
            </Button>
          </Stack>
        </Paper>
      ) : user.current_school_id || user.role ? (
        <Alert severity="warning">
          Ce compte est déjà rattaché à une école{user.role ? ' ou à un rôle d\'administration' : ''} : un prestataire
          doit utiliser un compte différent (rien à voir avec votre compte actuel), pour ne pas perdre votre rôle
          existant.
        </Alert>
      ) : (
        <Paper variant="outlined" sx={(theme) => ({ p: { xs: 3, md: 4 }, bgcolor: alpha(theme.palette.text.primary, 0.03) })}>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}

              <TextField select label="Catégorie" value={form.category} onChange={handleChange('category')} required fullWidth>
                {CATEGORIES.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Nom / raison sociale"
                value={form.business_name}
                onChange={handleChange('business_name')}
                required
                fullWidth
                autoFocus
              />

              <TextField
                label="Description (optionnel)"
                value={form.description}
                onChange={handleChange('description')}
                multiline
                minRows={2}
                fullWidth
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Pays"
                  value={form.country_id}
                  onChange={handleChange('country_id')}
                  required
                  fullWidth
                >
                  {(countries ?? []).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField label="Ville" value={form.city} onChange={handleChange('city')} fullWidth />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Téléphone" value={form.phone} onChange={handleChange('phone')} fullWidth />
                <TextField label="Email" type="email" value={form.email} onChange={handleChange('email')} fullWidth />
              </Stack>

              <Button type="submit" variant="contained" disabled={submitting} size="large">
                {submitting ? 'Envoi...' : "S'inscrire"}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}
    </Container>
  );
}
