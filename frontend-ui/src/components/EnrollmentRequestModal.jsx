import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../api/axios.jsx';

function emptyForm() {
  return {
    child_fullname: '',
    child_birthdate: '',
    level_wanted: '',
    parent_fullname: '',
    parent_phone: '',
    parent_email: '',
    message: '',
    company: '', // honeypot : laissé vide par un humain
  };
}

export default function EnrollmentRequestModal({ open, onClose, school }) {
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleClose() {
    setForm(emptyForm());
    setError(null);
    setSuccess(false);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.parent_phone.trim() && !form.parent_email.trim()) {
      setError('Indiquez au moins un numéro de téléphone ou un email pour être recontacté.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/schools/${school.id}/enrollment-requests`, form);
      setSuccess(true);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : 'Impossible d\'envoyer la demande.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Demande de pré-inscription — {school?.name}</DialogTitle>

      {success ? (
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Votre demande a été envoyée à l'école. Elle vous recontactera directement.
          </Alert>
          <Button onClick={handleClose} variant="contained" fullWidth>
            Fermer
          </Button>
        </DialogContent>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Nom de l'enfant"
              value={form.child_fullname}
              onChange={handleChange('child_fullname')}
              required
              fullWidth
              autoFocus
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Date de naissance (optionnel)"
                type="date"
                value={form.child_birthdate}
                onChange={handleChange('child_birthdate')}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Niveau souhaité (optionnel)"
                placeholder="ex: CP1, 6ème..."
                value={form.level_wanted}
                onChange={handleChange('level_wanted')}
                fullWidth
              />
            </Stack>

            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Vos coordonnées
            </Typography>
            <TextField
              label="Votre nom complet"
              value={form.parent_fullname}
              onChange={handleChange('parent_fullname')}
              required
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Téléphone"
                value={form.parent_phone}
                onChange={handleChange('parent_phone')}
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={form.parent_email}
                onChange={handleChange('parent_email')}
                fullWidth
              />
            </Stack>
            <TextField
              label="Message (optionnel)"
              value={form.message}
              onChange={handleChange('message')}
              multiline
              minRows={2}
              fullWidth
            />

            {/* Honeypot anti-bot : invisible et non atteignable pour un humain */}
            <Box sx={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
              <TextField
                label="Entreprise"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={form.company}
                onChange={handleChange('company')}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClose}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Envoi...' : 'Envoyer la demande'}
            </Button>
          </DialogActions>
        </Box>
      )}
    </Dialog>
  );
}
