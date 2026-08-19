import { Alert, Box, Card, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import api from '../api/axios.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

/**
 * Recharges de portefeuille cantine en attente de confirmation. Partagé
 * entre la page Cantine (onglet "Recharges à confirmer") et la page
 * Comptabilité (onglet "Recharges cantine") : c'est le comptable qui
 * encaisse l'argent au quotidien, pas forcément le personnel de cantine —
 * il n'a pas à changer de menu pour confirmer une recharge qu'il a
 * lui-même reçue.
 */
export default function CafeteriaRechargesTab({ schoolId }) {
  const { data, loading, error, reload } = useApiGet(schoolId ? `/schools/${schoolId}/cafeteria/wallet-transactions` : null, {
    params: { status: 0 },
  });

  async function handleConfirm(id) {
    await api.post(`/schools/${schoolId}/cafeteria/wallet-transactions/${id}/confirm`);
    await reload();
  }

  async function handleReject(id) {
    await api.post(`/schools/${schoolId}/cafeteria/wallet-transactions/${id}/reject`);
    await reload();
  }

  if (loading) return <Typography color="text.secondary">Chargement...</Typography>;

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {error}
      </Alert>
    );
  }

  const transactions = data?.data ?? [];

  return (
    <Stack spacing={1.5}>
      {transactions.map((t) => (
        <Card key={t.id} variant="outlined">
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2">{t.wallet?.student?.fullname}</Typography>
              <Typography variant="body2" color="text.secondary">
                {Number(t.amount).toLocaleString()} FCFA · {t.payment_method?.name}
                {t.transaction_id ? ` · Réf. ${t.transaction_id}` : ''}
              </Typography>
            </Box>
            <Chip label="En attente" color="warning" size="small" />
            <IconButton color="success" onClick={() => handleConfirm(t.id)}>
              <CheckIcon />
            </IconButton>
            <IconButton color="error" onClick={() => handleReject(t.id)}>
              <CloseIcon />
            </IconButton>
          </CardContent>
        </Card>
      ))}
      {transactions.length === 0 && <Typography color="text.secondary">Aucune recharge en attente.</Typography>}
    </Stack>
  );
}
