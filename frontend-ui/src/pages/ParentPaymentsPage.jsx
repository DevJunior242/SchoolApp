import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_LABELS = {
  0: { label: 'En attente de confirmation', color: 'warning' },
  1: { label: 'Confirmé', color: 'success' },
  2: { label: 'Rejeté', color: 'error' },
};

function emptyForm() {
  return { fee_structure_id: '', payment_method_id: '', amount: '', sender_number: '', transaction_id: '' };
}

export default function ParentPaymentsPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [methods, setMethods] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);

  useEffect(() => {
    if (!schoolId) return;
    Promise.all([
      api.get(`/schools/${schoolId}/my-children`).then((r) => {
        setChildren(r.data);
        if (r.data.length > 0) setSelectedChildId(r.data[0].id);
      }),
      api.get(`/schools/${schoolId}/payment-methods`).then((r) => setMethods(r.data)),
    ])
      .catch((err) => setLoadError(err.response?.data?.message || 'Impossible de charger vos paiements.'))
      .finally(() => setLoading(false));
  }, [schoolId]);

  async function loadSummary(childId) {
    setLoadError(null);
    try {
      const response = await api.get(`/schools/${schoolId}/students/${childId}/payments`);
      setSummary(response.data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Impossible de charger le suivi de cet enfant.");
    }
  }

  useEffect(() => {
    if (!selectedChildId) return;
    loadSummary(selectedChildId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/students/${selectedChildId}/payments`, form);
      await loadSummary(selectedChildId);
      setForm(emptyForm());
      setSuccess("Paiement déclaré. Il sera confirmé par l'école après vérification.");
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : 'Impossible de déclarer ce paiement.');
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

  if (children.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucun enfant rattaché à votre compte dans cette école.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Paiements de scolarité
      </Typography>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {children.length > 1 && (
        <Tabs value={selectedChildId} onChange={(_, value) => setSelectedChildId(value)} sx={{ mb: 3 }}>
          {children.map((child) => (
            <Tab key={child.id} value={child.id} label={child.fullname} />
          ))}
        </Tabs>
      )}

      {summary && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Solde
              </Typography>
              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total dû
                  </Typography>
                  <Typography variant="h6">{Number(summary.total_due).toLocaleString()} FCFA</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Payé
                  </Typography>
                  <Typography variant="h6">{Number(summary.total_confirmed).toLocaleString()} FCFA</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Solde restant
                  </Typography>
                  <Typography variant="h6" color={summary.balance > 0 ? 'error.main' : 'success.main'}>
                    {Number(summary.balance).toLocaleString()} FCFA
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Déclarer un paiement
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Après avoir envoyé l'argent via un des moyens ci-dessous, indiquez ici les détails pour que l'école confirme.
              </Typography>
              {methods.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Aucun moyen de paiement configuré par l'école pour l'instant.
                </Alert>
              )}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  select
                  label="Tranche concernée"
                  value={form.fee_structure_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, fee_structure_id: e.target.value }))}
                  required
                  fullWidth
                >
                  {summary.fee_structures.map((fee) => (
                    <MenuItem key={fee.id} value={fee.id}>
                      {fee.label} — {Number(fee.amount).toLocaleString()} FCFA
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Moyen de paiement utilisé"
                  value={form.payment_method_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, payment_method_id: e.target.value }))}
                  required
                  fullWidth
                  disabled={methods.length === 0}
                >
                  {methods.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name} {m.number ? `(${m.number})` : ''}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Montant envoyé (FCFA)"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Votre numéro (celui qui a envoyé)"
                  value={form.sender_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, sender_number: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="ID de transaction (optionnel)"
                  value={form.transaction_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, transaction_id: e.target.value }))}
                  fullWidth
                />
                <Button type="submit" variant="contained" disabled={submitting || methods.length === 0}>
                  {submitting ? 'Envoi...' : 'Déclarer le paiement'}
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="h6" gutterBottom>
              Historique
            </Typography>
            <Stack spacing={1.5}>
              {summary.payments.map((p) => (
                <Card key={p.id} variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2">{p.fee_structure.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Number(p.amount).toLocaleString()} FCFA · {p.payment_method.name}
                        {p.transaction_id ? ` · Réf. ${p.transaction_id}` : ''}
                      </Typography>
                    </Box>
                    <Chip label={STATUS_LABELS[p.status].label} color={STATUS_LABELS[p.status].color} size="small" />
                    {p.status === 1 && (
                      <Button size="small" startIcon={<DownloadIcon />} onClick={() => setReceiptPayment(p)}>
                        Reçu
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {summary.payments.length === 0 && <Typography color="text.secondary">Aucun paiement déclaré pour l'instant.</Typography>}
            </Stack>
          </Grid>
        </Grid>
      )}

      <Dialog open={Boolean(receiptPayment)} onClose={() => setReceiptPayment(null)} fullWidth maxWidth="xs">
        <DialogContent>
          {receiptPayment && (
            <Box id="receipt-print" sx={{ p: 1 }}>
              <Typography variant="h6" gutterBottom>
                {user.current_school?.name}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Reçu de paiement
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Élève</Typography>
                  <Typography fontWeight={600}>{children.find((c) => c.id === selectedChildId)?.fullname}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Tranche</Typography>
                  <Typography fontWeight={600}>{receiptPayment.fee_structure.label}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Montant</Typography>
                  <Typography fontWeight={600}>{Number(receiptPayment.amount).toLocaleString()} FCFA</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Moyen de paiement</Typography>
                  <Typography fontWeight={600}>{receiptPayment.payment_method.name}</Typography>
                </Stack>
                {receiptPayment.transaction_id && (
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Réf. transaction</Typography>
                    <Typography fontWeight={600}>{receiptPayment.transaction_id}</Typography>
                  </Stack>
                )}
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Date</Typography>
                  <Typography fontWeight={600}>{new Date(receiptPayment.created_at).toLocaleDateString()}</Typography>
                </Stack>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">
                Paiement confirmé — document généré depuis EduAfrique.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReceiptPayment(null)}>Fermer</Button>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => window.print()}>
            Télécharger (PDF)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
