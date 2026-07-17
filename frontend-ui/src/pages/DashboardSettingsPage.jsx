import { useRef, useState } from 'react';
import { Alert, Avatar, Box, Button, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

function emptyForm() {
  return { name: '', slogan: '', address: '', city: '', phone: '', email: '', website: '', language: 'fr', currency: '' };
}

export default function DashboardSettingsPage() {
  const { user, refreshUser } = useAuth();
  const schoolId = user.current_school_id;
  const { data: school, loading, error, reload } = useApiGet(schoolId ? `/schools/${schoolId}/settings` : null);

  const [form, setForm] = useState(emptyForm());
  const [formInitialized, setFormInitialized] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  // Ne synchronise le formulaire qu'une seule fois depuis les données
  // chargées : sinon un refetch (StrictMode, reload()) écrase les saisies
  // en cours de l'utilisateur. Ajustement pendant le rendu (pattern React
  // recommandé) plutôt qu'un useEffect, pour éviter un rendu en cascade.
  if (school && !formInitialized) {
    setForm({
      name: school.name ?? '',
      slogan: school.slogan ?? '',
      address: school.address ?? '',
      city: school.city ?? '',
      phone: school.phone ?? '',
      email: school.email ?? '',
      website: school.website ?? '',
      language: school.language ?? 'fr',
      currency: school.currency ?? '',
    });
    setFormInitialized(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('_method', 'PUT');
      Object.entries(form).forEach(([key, value]) => formData.append(key, value ?? ''));
      if (logoFile) formData.append('logo', logoFile);

      // PHP ne peuple $_FILES que sur POST : on passe par le classique
      // spoofing Laravel (_method=PUT) pour pouvoir envoyer un fichier.
      await api.post(`/schools/${schoolId}/settings`, formData);
      setLogoFile(null);
      await reload();
      await refreshUser();
      setSuccess('Paramètres enregistrés.');
    } catch (err) {
      const messages = err.response?.data?.errors;
      setFormError(messages ? Object.values(messages).flat().join(' ') : 'Impossible d\'enregistrer les paramètres.');
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

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Paramètres de l'école
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Informations générales, langue et devise utilisées par {school?.name}.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }}>
        {formError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1 }}>
            <Avatar
              src={logoPreview ?? school?.logo_url ?? undefined}
              variant="rounded"
              sx={{ width: 72, height: 72, bgcolor: 'action.hover' }}
            >
              {school?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleLogoChange}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<PhotoCameraIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Changer le logo
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                PNG ou JPG, 2 Mo maximum.
              </Typography>
            </Box>
          </Stack>
          <TextField
            label="Nom de l'école"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Slogan (optionnel)"
            value={form.slogan}
            onChange={(e) => setForm((prev) => ({ ...prev, slogan: e.target.value }))}
            fullWidth
          />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Ville"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Adresse"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                fullWidth
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Téléphone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                fullWidth
              />
            </Grid>
          </Grid>
          <TextField
            label="Site web (optionnel)"
            placeholder="https://..."
            value={form.website}
            onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Langue"
              value={form.language}
              onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}
              required
              fullWidth
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <MenuItem key={l.value} value={l.value}>
                  {l.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Devise"
              placeholder={school?.country?.currency ?? 'ex: XOF'}
              helperText={`Laissez vide pour utiliser celle du pays (${school?.country?.currency ?? '—'})`}
              value={form.currency}
              onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
              fullWidth
            />
          </Stack>

          <Button type="submit" variant="contained" disabled={submitting} sx={{ alignSelf: 'flex-start' }}>
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
