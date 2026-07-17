import { useState } from 'react';
import { Alert, Button } from '@mui/material';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.email_verified_at) return null;

  async function handleResend() {
    setSending(true);
    try {
      await api.post('/email/verification-notification');
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <Alert
      severity="warning"
      sx={{ mb: 3 }}
      action={
        <Button color="inherit" size="small" onClick={handleResend} disabled={sending || sent}>
          {sent ? 'Email envoyé' : sending ? 'Envoi...' : 'Renvoyer le lien'}
        </Button>
      }
    >
      Votre email n'est pas encore vérifié. Certaines actions (créer une école, inscrire des élèves,
      etc.) sont bloquées tant qu'il ne l'est pas.
    </Alert>
  );
}
