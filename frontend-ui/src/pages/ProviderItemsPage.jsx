import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import api from '../api/axios.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

function emptyForm() {
  return { name: '', description: '', price: '' };
}

export default function ProviderItemsPage() {
  const { data: provider, loading, error, reload } = useApiGet('/marketplace/my-provider');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setCurrentImageUrl(null);
    setFile(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? '',
      price: item.price ?? '',
    });
    setCurrentImageUrl(item.image_url);
    setFile(null);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      if (form.description) formData.append('description', form.description);
      if (form.price !== '') formData.append('price', form.price);
      if (file) formData.append('image', file);

      if (editingId) {
        formData.append('_method', 'PUT');
        await api.post(`/marketplace/items/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/marketplace/my-provider/items', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      await reload();
      setDialogOpen(false);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setFormError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'enregistrer cet article.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    await api.delete(`/marketplace/items/${id}`);
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

  const items = provider?.items ?? [];

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Mes articles
        </Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
          Ajouter
        </Button>
      </Stack>

      <Stack spacing={1.5}>
        {items.map((item) => (
          <Card key={item.id} variant="outlined">
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Avatar src={item.image_url ?? undefined} variant="rounded" sx={{ width: 48, height: 48 }}>
                {item.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2">{item.name}</Typography>
                {item.price !== null && (
                  <Typography variant="body2" color="text.secondary">
                    {Number(item.price).toLocaleString()}
                  </Typography>
                )}
                {item.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {item.description}
                  </Typography>
                )}
              </Box>
              <IconButton size="small" onClick={() => openEdit(item)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleDelete(item.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <Typography color="text.secondary">Aucun article publié pour l'instant.</Typography>}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingId ? "Modifier l'article" : 'Ajouter un article'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Nom"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Description (optionnel)"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Prix (optionnel)"
              type="number"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              fullWidth
            />
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={file ? URL.createObjectURL(file) : currentImageUrl ?? undefined} variant="rounded" sx={{ width: 56, height: 56 }} />
              <Button component="label" variant="outlined">
                {file ? file.name : 'Choisir une photo'}
                <input type="file" hidden accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
