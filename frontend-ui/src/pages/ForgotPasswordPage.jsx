import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { motion } from 'motion/react';
import { Link as RouterLink } from 'react-router-dom';
import api from '../api/axios.jsx';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const response = await api.post('/forgot-password', { email });
      setMessage(response.data.message);
    } catch {
      setError("Impossible d'envoyer le lien pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <motion.div
        style={{ width: '100%', maxWidth: 360 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: '100%' }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Mot de passe oublié
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Entrez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {message && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" disabled={submitting} fullWidth>
              {submitting ? 'Envoi...' : 'Envoyer le lien'}
            </Button>
            <Button component={RouterLink} to="/login" variant="text" fullWidth>
              Retour à la connexion
            </Button>
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
}
