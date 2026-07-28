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
  Stack,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import api from '../api/axios.jsx';

const CATEGORY_VIDEO = 1;
const CATEGORY_DEVOIR = 2;
const CATEGORY_EXAMEN = 3;

const SECTIONS = [
  { category: CATEGORY_VIDEO, label: 'Vidéos' },
  { category: CATEGORY_DEVOIR, label: 'Devoirs' },
  { category: CATEGORY_EXAMEN, label: 'Examens' },
];

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Liste de contenus de cours groupée par catégorie — partagée entre la vue
 * professeur (avec suppression/ajout de correction) et la vue élève/parent
 * (lecture seule).
 */
export default function CourseContentList({ contents, canManage = false, onDelete, onRefresh }) {
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [correctionFile, setCorrectionFile] = useState(null);
  const [correctionError, setCorrectionError] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function handleDownload(content) {
    const response = await api.get(`/course-contents/${content.id}/download`, { responseType: 'blob' });
    downloadBlob(response.data, `${content.title}.pdf`);
  }

  async function handleDownloadCorrection(content) {
    const response = await api.get(`/course-contents/${content.id}/correction/download`, { responseType: 'blob' });
    downloadBlob(response.data, `${content.title}-correction.pdf`);
  }

  async function handleUploadCorrection(e) {
    e.preventDefault();
    setCorrectionError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', correctionFile);
      await api.post(`/course-contents/${correctionTarget.id}/correction`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCorrectionTarget(null);
      setCorrectionFile(null);
      await onRefresh?.();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setCorrectionError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'envoyer la correction.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Box>
      {SECTIONS.map((section) => {
        const items = (contents ?? []).filter((c) => c.category === section.category);
        if (items.length === 0) return null;

        return (
          <Box key={section.category} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {section.label}
            </Typography>
            <Stack spacing={1.5}>
              {items.map((content) => (
                <Card key={content.id} variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2">{content.title}</Typography>
                      {content.description && (
                        <Typography variant="body2" color="text.secondary">
                          {content.description}
                        </Typography>
                      )}
                    </Box>

                    {content.category === CATEGORY_VIDEO && (
                      <Button
                        size="small"
                        startIcon={<PlayCircleIcon />}
                        component="a"
                        href={content.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Regarder
                      </Button>
                    )}

                    {content.category !== CATEGORY_VIDEO && (
                      <>
                        <Button size="small" startIcon={<DownloadIcon />} onClick={() => handleDownload(content)}>
                          Énoncé
                        </Button>
                        {content.correction_path && (
                          <Button size="small" startIcon={<DownloadIcon />} onClick={() => handleDownloadCorrection(content)}>
                            Correction
                          </Button>
                        )}
                        {canManage && !content.correction_path && (
                          <Button size="small" startIcon={<UploadFileIcon />} onClick={() => setCorrectionTarget(content)}>
                            Ajouter la correction
                          </Button>
                        )}
                      </>
                    )}

                    {canManage && (
                      <IconButton size="small" onClick={() => onDelete?.(content.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        );
      })}

      {(contents ?? []).length === 0 && <Typography color="text.secondary">Aucun contenu publié pour l'instant.</Typography>}

      <Dialog open={!!correctionTarget} onClose={() => setCorrectionTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter la correction — {correctionTarget?.title}</DialogTitle>
        <Box component="form" onSubmit={handleUploadCorrection}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {correctionError && <Alert severity="error">{correctionError}</Alert>}
            <Button component="label" variant="outlined">
              {correctionFile ? correctionFile.name : 'Choisir un fichier PDF'}
              <input type="file" hidden accept="application/pdf" onChange={(e) => setCorrectionFile(e.target.files[0])} required />
            </Button>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCorrectionTarget(null)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={uploading || !correctionFile}>
              {uploading ? 'Envoi...' : 'Envoyer'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
