import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '../api/axios.jsx';
import CourseContentList from '../components/CourseContentList.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

const CATEGORY_VIDEO = 1;
const CATEGORY_DEVOIR = 2;
const CATEGORY_EXAMEN = 3;

function emptyForm() {
  return { category: CATEGORY_VIDEO, title: '', description: '', video_url: '' };
}

export default function AssignmentCourseContentPage() {
  const { assignmentId } = useParams();
  const { data: assignment } = useApiGet(`/assignments/${assignmentId}`);
  const { data: contents, loading, error, reload } = useApiGet(`/assignments/${assignmentId}/course-contents`);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category', form.category);
      formData.append('title', form.title);
      if (form.description) formData.append('description', form.description);
      if (form.category === CATEGORY_VIDEO) {
        formData.append('video_url', form.video_url);
      } else if (file) {
        formData.append('file', file);
      }
      await api.post(`/assignments/${assignmentId}/course-contents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await reload();
      setDialogOpen(false);
      setForm(emptyForm());
      setFile(null);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setFormError(messages ? Object.values(messages).flat().join(' ') : 'Impossible de publier ce contenu.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(contentId) {
    await api.delete(`/course-contents/${contentId}`);
    await reload();
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {assignment?.subject?.name}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {assignment?.school_class?.name} {assignment?.school_class?.level?.name ? `· ${assignment.school_class.level.name}` : ''}
      </Typography>

      <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)} sx={{ mb: 3 }}>
        Publier un contenu
      </Button>

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <CourseContentList contents={contents} canManage onDelete={handleDelete} onRefresh={reload} />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Publier un contenu</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              select
              label="Type"
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: Number(e.target.value) }))}
              fullWidth
            >
              <MenuItem value={CATEGORY_VIDEO}>Vidéo</MenuItem>
              <MenuItem value={CATEGORY_DEVOIR}>Devoir</MenuItem>
              <MenuItem value={CATEGORY_EXAMEN}>Examen</MenuItem>
            </TextField>
            <TextField
              label="Titre"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
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
            {form.category === CATEGORY_VIDEO ? (
              <TextField
                label="Lien de la vidéo (YouTube, Vimeo...)"
                value={form.video_url}
                onChange={(e) => setForm((p) => ({ ...p, video_url: e.target.value }))}
                required
                fullWidth
              />
            ) : (
              <Button component="label" variant="outlined">
                {file ? file.name : 'Choisir un fichier PDF'}
                <input type="file" hidden accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} required />
              </Button>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Publication...' : 'Publier'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
