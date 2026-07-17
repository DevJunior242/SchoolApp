import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

const STEPS = ['Informations de l\'école', "Clé d'activation"];

export default function CreateSchoolPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { data: countries } = useApiGet('/countries', { enabled: Boolean(user) });

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', country_id: '' });
  const [activationKey, setActivationKey] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleNext(e) {
    e.preventDefault();
    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/schools', { ...form, activation_key: activationKey.trim() });
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 403) {
        setError("Vous devez vérifier votre email avant de créer une école. Consultez votre boîte mail, ou demandez un nouveau lien depuis votre tableau de bord.");
        return;
      }
      const messages = err.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(' ')
          : err.response?.data?.message || "Impossible de créer l'école."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Créer une école
      </Typography>

      {!user ? (
        <Paper
          variant="outlined"
          sx={(theme) => ({ p: 4, mt: 3, bgcolor: alpha(theme.palette.text.primary, 0.03) })}
        >
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Connectez-vous ou créez un compte pour créer votre école.
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
      ) : (
        <Paper
          variant="outlined"
          sx={(theme) => ({ p: { xs: 3, md: 4 }, mt: 3, bgcolor: alpha(theme.palette.text.primary, 0.03) })}
        >
          <Stepper activeStep={step - 1} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {step === 1 ? (
            <Box component="form" onSubmit={handleNext}>
              <Stack spacing={2.5}>
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
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', mt: 1 }}>
                  <Button component={RouterLink} to="/">
                    Annuler
                  </Button>
                  <Button type="submit" variant="contained" disabled={!form.name.trim() || !form.country_id}>
                    Continuer
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <Typography color="text.secondary">
                  Entrez la clé d'activation fournie par l'équipe EduAfrique pour finaliser la
                  création de <strong>{form.name}</strong>.
                </Typography>
                <TextField
                  label="Clé d'activation"
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                  placeholder="school-..."
                  required
                  fullWidth
                  autoFocus
                />
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', mt: 1 }}>
                  <Button onClick={() => setStep(1)}>Retour</Button>
                  <Button type="submit" variant="contained" disabled={submitting || !activationKey.trim()}>
                    {submitting ? 'Création...' : "Créer l'école"}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Paper>
      )}
    </Container>
  );
}
