import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

function emptyBusForm() {
  return { label: '', plate_number: '', driver_id: '' };
}

export default function DashboardBusesPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;

  const { data: buses, loading, reload } = useApiGet(schoolId ? `/schools/${schoolId}/buses` : null);
  // Pas de filtre par rôle côté API : on récupère tous les membres (pagination
  // large) et on filtre les chauffeurs ici.
  const { data: drivers } = useApiGet(schoolId ? `/schools/${schoolId}/members` : null, {
    params: { per_page: 1000 },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyBusForm());
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedBusId, setSelectedBusId] = useState(null);
  const [stopsError, setStopsError] = useState(null);
  const [stopsSubmitting, setStopsSubmitting] = useState(false);
  const [stops, setStops] = useState(null);
  const [stopsInitializedFor, setStopsInitializedFor] = useState(null);

  const driverList = (drivers?.data ?? []).filter((m) => m.role?.slug === 'chauffeur');
  const selectedBus = (buses ?? []).find((b) => b.id === selectedBusId);

  // Ajustement pendant le rendu : resynchronise les arrêts quand on
  // sélectionne un autre bus, sans écraser une saisie en cours.
  if (selectedBus && stopsInitializedFor !== selectedBusId) {
    setStops(selectedBus.stops?.map((s) => ({ id: s.id, label: s.label, latitude: s.latitude ?? '', longitude: s.longitude ?? '' })) ?? [{ label: '', latitude: '', longitude: '' }]);
    setStopsInitializedFor(selectedBusId);
  }

  async function handleSubmitBus(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/buses`, form);
      await reload();
      setDialogOpen(false);
      setForm(emptyBusForm());
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : "Impossible de créer ce bus.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteBus(id) {
    await api.delete(`/schools/${schoolId}/buses/${id}`);
    if (selectedBusId === id) setSelectedBusId(null);
    await reload();
  }

  function updateStop(index, field, value) {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addStop() {
    setStops((prev) => [...prev, { label: '', latitude: '', longitude: '' }]);
  }

  function removeStop(index) {
    setStops((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitStops(e) {
    e.preventDefault();
    setStopsError(null);
    setStopsSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/buses/${selectedBusId}/stops`, {
        stops: stops.map((s) => ({
          id: s.id,
          label: s.label,
          latitude: s.latitude === '' ? null : s.latitude,
          longitude: s.longitude === '' ? null : s.longitude,
        })),
      });
      await reload();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setStopsError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'enregistrer les arrêts.");
    } finally {
      setStopsSubmitting(false);
    }
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Bus scolaire
        </Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
          Ajouter un bus
        </Button>
      </Stack>

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {(buses ?? []).map((bus) => (
            <Card key={bus.id} variant="outlined" sx={{ borderColor: selectedBusId === bus.id ? 'primary.main' : undefined }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} onClick={() => setSelectedBusId(bus.id)}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1">{bus.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {bus.plate_number || 'Sans plaque'} · {bus.driver ? bus.driver.fullname : 'Aucun chauffeur assigné'} · {bus.stops?.length ?? 0} arrêt(s)
                  </Typography>
                </Box>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteBus(bus.id); }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardContent>
            </Card>
          ))}
          {(buses ?? []).length === 0 && <Typography color="text.secondary">Aucun bus pour l'instant.</Typography>}
        </Stack>
      )}

      {selectedBus && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Arrêts — {selectedBus.label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Latitude/longitude optionnelles mais nécessaires pour le suivi en direct et l'alerte "bus proche".
          </Typography>

          {stopsError && <Alert severity="error" sx={{ mb: 2 }}>{stopsError}</Alert>}

          <Box component="form" onSubmit={handleSubmitStops}>
            <Stack spacing={2}>
              {(stops ?? []).map((stop, index) => (
                <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label={`Arrêt ${index + 1}`}
                    value={stop.label}
                    onChange={(e) => updateStop(index, 'label', e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Latitude"
                    type="number"
                    value={stop.latitude}
                    onChange={(e) => updateStop(index, 'latitude', e.target.value)}
                    sx={{ width: { xs: '100%', sm: 160 } }}
                  />
                  <TextField
                    label="Longitude"
                    type="number"
                    value={stop.longitude}
                    onChange={(e) => updateStop(index, 'longitude', e.target.value)}
                    sx={{ width: { xs: '100%', sm: 160 } }}
                  />
                  <IconButton onClick={() => removeStop(index)} disabled={stops.length === 1}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Button startIcon={<AddIcon />} onClick={addStop} sx={{ mt: 2 }}>
              Ajouter un arrêt
            </Button>
            <Box>
              <Button type="submit" variant="contained" disabled={stopsSubmitting} sx={{ mt: 2 }}>
                {stopsSubmitting ? 'Enregistrement...' : 'Enregistrer les arrêts'}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter un bus</DialogTitle>
        <Box component="form" onSubmit={handleSubmitBus}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Nom du bus"
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Plaque d'immatriculation (optionnel)"
              value={form.plate_number}
              onChange={(e) => setForm((p) => ({ ...p, plate_number: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Chauffeur (optionnel)"
              value={form.driver_id}
              onChange={(e) => setForm((p) => ({ ...p, driver_id: e.target.value }))}
              fullWidth
              helperText={driverList.length === 0 ? "Ajoutez d'abord un membre avec le rôle chauffeur" : ''}
            >
              <MenuItem value="">Aucun</MenuItem>
              {driverList.map((m) => (
                <MenuItem key={m.user.id} value={m.user.id}>
                  {m.user.fullname}
                </MenuItem>
              ))}
            </TextField>
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
