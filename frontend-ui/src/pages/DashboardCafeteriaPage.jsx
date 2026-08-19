import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../api/axios.jsx';
import CafeteriaServiceTab from '../components/CafeteriaServiceTab.jsx';
import CafeteriaRechargesTab from '../components/CafeteriaRechargesTab.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardCafeteriaPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;

  const [tab, setTab] = useState('service');

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Cantine
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab value="service" label="Service" />
        <Tab value="menu" label="Menu du jour" />
        <Tab value="recharges" label="Recharges à confirmer" />
      </Tabs>

      {tab === 'service' && <CafeteriaServiceTab schoolId={schoolId} />}
      {tab === 'menu' && <MenuTab schoolId={schoolId} />}
      {tab === 'recharges' && <CafeteriaRechargesTab schoolId={schoolId} />}
    </Box>
  );
}

function MenuTab({ schoolId }) {
  const [date, setDate] = useState(today());
  const { data: menu, loading, reload } = useApiGet(schoolId ? `/schools/${schoolId}/cafeteria/menu` : null, {
    params: { date },
  });

  const [items, setItems] = useState(null);
  const [initializedFor, setInitializedFor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Ajustement pendant le rendu : resynchronise les items dès qu'on change
  // de date (nouvelle réponse), sans écraser une saisie en cours.
  if (!loading && initializedFor !== date) {
    setItems(menu?.items?.map((i) => ({ label: i.label, price: i.price })) ?? [{ label: '', price: '' }]);
    setInitializedFor(date);
  }

  function updateItem(index, field, value) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { label: '', price: '' }]);
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/cafeteria/menu`, { date, items });
      await reload();
      setSuccess('Menu enregistré.');
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'enregistrer le menu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !items) return <Typography color="text.secondary">Chargement...</Typography>;

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ mb: 3 }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Stack spacing={2}>
        {items.map((item, index) => (
          <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField
              label="Plat"
              value={item.label}
              onChange={(e) => updateItem(index, 'label', e.target.value)}
              required
              fullWidth
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="Prix (FCFA)"
                type="number"
                value={item.price}
                onChange={(e) => updateItem(index, 'price', e.target.value)}
                required
                sx={{ width: { xs: '100%', sm: 160 } }}
              />
              <IconButton onClick={() => removeItem(index)} disabled={items.length === 1}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        ))}
      </Stack>

      <Button startIcon={<AddIcon />} onClick={addItem} sx={{ mt: 2 }}>
        Ajouter un plat
      </Button>

      <Box>
        <Button type="submit" variant="contained" disabled={submitting} sx={{ mt: 2 }}>
          {submitting ? 'Enregistrement...' : 'Enregistrer le menu'}
        </Button>
      </Box>
    </Box>
  );
}
