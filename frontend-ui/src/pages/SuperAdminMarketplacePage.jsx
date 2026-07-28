import { useState } from 'react';
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
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { Navigate } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

const CATEGORY_LABELS = {
  1: 'Enseignant',
  2: 'Formateur',
  3: 'Chauffeur',
  4: 'Fournisseur',
  5: 'Imprimeur',
  6: 'Librairie',
};

export default function SuperAdminMarketplacePage() {
  const { user } = useAuth();
  const [section, setSection] = useState('providers');

  if (user?.role?.slug !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Marketplace — modération
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Une fiche apparaît dans l'annuaire des écoles seulement si elle est approuvée ET que l'abonnement est à jour.
      </Typography>

      <Tabs value={section} onChange={(_, v) => setSection(v)} sx={{ mb: 3 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab value="providers" label="Fiches" />
        <Tab value="payments" label="Paiements" />
        <Tab value="plans" label="Formules" />
        <Tab value="methods" label="Moyens de paiement" />
      </Tabs>

      {section === 'providers' && <ProvidersSection />}
      {section === 'payments' && <PaymentsSection />}
      {section === 'plans' && <PlansSection />}
      {section === 'methods' && <PaymentMethodsSection />}
    </Box>
  );
}

const PERIOD_LABELS = { 1: 'Mensuelle', 2: 'Annuelle' };

function PlansSection() {
  const { data: plans, loading, error, reload } = useApiGet('/admin/marketplace/plans');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ period: 1, amount: '', currency: 'FCFA' });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post('/admin/marketplace/plans', form);
      await reload();
      setDialogOpen(false);
      setForm({ period: 1, amount: '', currency: 'FCFA' });
    } catch (err) {
      const messages = err.response?.data?.errors;
      setFormError(messages ? Object.values(messages).flat().join(' ') : 'Impossible de créer cette formule.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(plan) {
    await api.put(`/admin/marketplace/plans/${plan.id}`, { active: !plan.active });
    await reload();
  }

  async function handleDelete(id) {
    await api.delete(`/admin/marketplace/plans/${id}`);
    await reload();
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
          Ajouter une formule
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5}>
          {(plans ?? []).map((plan) => (
            <Card key={plan.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1">
                    {PERIOD_LABELS[plan.period]} — {Number(plan.amount).toLocaleString()} {plan.currency}
                  </Typography>
                </Box>
                <Switch checked={plan.active} onChange={() => handleToggleActive(plan)} />
                <IconButton size="small" onClick={() => handleDelete(plan.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardContent>
            </Card>
          ))}
          {(plans ?? []).length === 0 && <Typography color="text.secondary">Aucune formule définie.</Typography>}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter une formule</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              select
              label="Période"
              value={form.period}
              onChange={(e) => setForm((p) => ({ ...p, period: Number(e.target.value) }))}
              fullWidth
            >
              <MenuItem value={1}>Mensuelle</MenuItem>
              <MenuItem value={2}>Annuelle</MenuItem>
            </TextField>
            <TextField
              label="Montant"
              type="number"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Devise"
              value={form.currency}
              onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Création...' : 'Créer'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}

function PaymentMethodsSection() {
  const { data: methods, loading, error, reload } = useApiGet('/admin/marketplace/payment-methods');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', number: '', instructions: '' });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post('/admin/marketplace/payment-methods', form);
      await reload();
      setDialogOpen(false);
      setForm({ name: '', number: '', instructions: '' });
    } catch (err) {
      const messages = err.response?.data?.errors;
      setFormError(messages ? Object.values(messages).flat().join(' ') : 'Impossible de créer ce moyen de paiement.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(method) {
    await api.put(`/admin/marketplace/payment-methods/${method.id}`, { is_active: !method.is_active });
    await reload();
  }

  async function handleDelete(id) {
    await api.delete(`/admin/marketplace/payment-methods/${id}`);
    await reload();
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
          Ajouter un moyen de paiement
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5}>
          {(methods ?? []).map((method) => (
            <Card key={method.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1">{method.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {method.number}
                    {method.instructions ? ` — ${method.instructions}` : ''}
                  </Typography>
                </Box>
                <Switch checked={method.is_active} onChange={() => handleToggleActive(method)} />
                <IconButton size="small" onClick={() => handleDelete(method.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardContent>
            </Card>
          ))}
          {(methods ?? []).length === 0 && <Typography color="text.secondary">Aucun moyen de paiement défini.</Typography>}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter un moyen de paiement</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Nom"
              placeholder="Orange Money, Virement..."
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Numéro / compte (optionnel)"
              value={form.number}
              onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Instructions (optionnel)"
              value={form.instructions}
              onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Création...' : 'Créer'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}

const STATUS_TABS = [
  { value: 1, label: 'En attente' },
  { value: 2, label: 'Approuvés' },
  { value: 3, label: 'Rejetés' },
];

function ProvidersSection() {
  const [status, setStatus] = useState(1);
  const { data, loading, error, reload } = useApiGet('/admin/marketplace/providers', { params: { status } });
  const [actionError, setActionError] = useState(null);

  async function handleApprove(id) {
    setActionError(null);
    try {
      await api.post(`/admin/marketplace/providers/${id}/approve`);
      await reload();
    } catch {
      setActionError("Impossible d'approuver cette fiche.");
    }
  }

  async function handleReject(id) {
    setActionError(null);
    try {
      await api.post(`/admin/marketplace/providers/${id}/reject`);
      await reload();
    } catch {
      setActionError('Impossible de rejeter cette fiche.');
    }
  }

  const providers = data?.data ?? [];

  return (
    <Box>
      <Tabs value={status} onChange={(_, v) => setStatus(v)} sx={{ mb: 3 }}>
        {STATUS_TABS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </Tabs>

      {(error || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || actionError}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5}>
          {providers.map((p) => (
            <Card key={p.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                  <Typography variant="subtitle1">{p.business_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.country?.name} {p.city ? `· ${p.city}` : ''} · {p.phone || p.email}
                  </Typography>
                  {p.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {p.description}
                    </Typography>
                  )}
                </Box>
                <Chip label={CATEGORY_LABELS[p.category] ?? p.category} size="small" />
                {status === 1 && (
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" color="success" startIcon={<CheckIcon />} onClick={() => handleApprove(p.id)}>
                      Approuver
                    </Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon />} onClick={() => handleReject(p.id)}>
                      Rejeter
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          ))}
          {providers.length === 0 && <Typography color="text.secondary">Aucune fiche ici.</Typography>}
        </Stack>
      )}
    </Box>
  );
}

function PaymentsSection() {
  const { data, loading, error, reload } = useApiGet('/admin/marketplace/payments', { params: { status: 1 } });
  const [actionError, setActionError] = useState(null);

  async function handleConfirm(id) {
    setActionError(null);
    try {
      await api.post(`/admin/marketplace/payments/${id}/confirm`);
      await reload();
    } catch {
      setActionError('Impossible de confirmer ce paiement.');
    }
  }

  async function handleReject(id) {
    setActionError(null);
    try {
      await api.post(`/admin/marketplace/payments/${id}/reject`);
      await reload();
    } catch {
      setActionError('Impossible de rejeter ce paiement.');
    }
  }

  const payments = data?.data ?? [];

  return (
    <Box>
      {(error || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || actionError}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5}>
          {payments.map((p) => (
            <Card key={p.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                  <Typography variant="subtitle1">{p.service_provider?.business_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Number(p.amount).toLocaleString()} · réf. {p.reference || '—'} · signalé le{' '}
                    {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" color="success" startIcon={<CheckIcon />} onClick={() => handleConfirm(p.id)}>
                    Confirmer
                  </Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon />} onClick={() => handleReject(p.id)}>
                    Rejeter
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {payments.length === 0 && <Typography color="text.secondary">Aucun paiement en attente.</Typography>}
        </Stack>
      )}
    </Box>
  );
}
