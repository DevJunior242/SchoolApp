import { useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState({
    fullname: user.fullname ?? '',
    phone: user.phone ?? '',
    language: user.language ?? 'fr',
  });
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('fullname', form.fullname);
      formData.append('phone', form.phone ?? '');
      formData.append('language', form.language);
      if (avatarFile) formData.append('avatar', avatarFile);

      await api.post('/profile', formData);
      setAvatarFile(null);
      await refreshUser();
      setSuccess('Profil mis à jour.');
    } catch (err) {
      const messages = err.response?.data?.errors;
      setFormError(messages ? Object.values(messages).flat().join(' ') : 'Impossible de mettre à jour le profil.');
    } finally {
      setSubmitting(false);
    }
  }

  // --- Changement de mot de passe ---
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    setChangingPassword(true);
    try {
      await api.post('/profile/password', passwordForm);
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
      setPasswordSuccess('Mot de passe mis à jour.');
    } catch (err) {
      const messages = err.response?.data?.errors;
      setPasswordError(messages ? Object.values(messages).flat().join(' ') : 'Impossible de changer le mot de passe.');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Mon profil
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Vos informations personnelles, visibles par les membres de vos écoles.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 560, mb: 3 }}>
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
              src={avatarPreview ?? user.avatar_url ?? undefined}
              sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: '1.5rem', fontWeight: 700 }}
            >
              {user.fullname?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<PhotoCameraIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Changer la photo
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                PNG ou JPG, 2 Mo maximum.
              </Typography>
            </Box>
          </Stack>

          <TextField
            label="Nom complet"
            value={form.fullname}
            onChange={(e) => setForm((prev) => ({ ...prev, fullname: e.target.value }))}
            required
            fullWidth
          />
          <TextField label="Email" value={user.email} disabled fullWidth helperText="L'email ne peut pas être modifié ici." />
          <TextField
            label="Téléphone"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            fullWidth
          />
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

          <Button type="submit" variant="contained" disabled={submitting} sx={{ alignSelf: 'flex-start' }}>
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Changer le mot de passe
        </Typography>
        {passwordError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {passwordError}
          </Alert>
        )}
        {passwordSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {passwordSuccess}
          </Alert>
        )}
        <Box component="form" onSubmit={handlePasswordSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Mot de passe actuel"
            type="password"
            value={passwordForm.current_password}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Nouveau mot de passe"
            type="password"
            value={passwordForm.password}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Confirmer le nouveau mot de passe"
            type="password"
            value={passwordForm.password_confirmation}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={changingPassword} sx={{ alignSelf: 'flex-start' }}>
            {changingPassword ? 'Modification...' : 'Changer le mot de passe'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
