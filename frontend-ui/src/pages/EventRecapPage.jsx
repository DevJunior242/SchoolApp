import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { useSchools } from "../hooks/useSchools.js";

const MANAGER_ROLE_SLUGS = ["directeur", "censeur", "secretaire"];

function formatDate(d) {
  return new Date(d).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function EventRecapPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { schoolUsers } = useSchools();
  const currentRole = schoolUsers.find((su) => su.school.id === schoolId)?.role
    ?.slug;
  const canManage = MANAGER_ROLE_SLUGS.includes(currentRole);

  const {
    data: recap,
    loading,
    error,
    reload,
  } = useApiGet(
    schoolId ? `/schools/${schoolId}/events/${eventId}/recap` : null,
  );

  const [summary, setSummary] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [formInitialized, setFormInitialized] = useState(false);

  // Ajustement pendant le rendu (pattern React recommandé) plutôt qu'un
  // useEffect, pour ne synchroniser le formulaire qu'une fois depuis les
  // données chargées sans écraser une saisie en cours au prochain reload().
  if (recap && !formInitialized) {
    setSummary(recap.summary ?? "");
    setVideoUrl(recap.video_url ?? "");
    setFormInitialized(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("summary", summary);
      formData.append("video_url", videoUrl);
      if (publishNow) formData.append("publish", "1");
      photoFiles.forEach((file) => formData.append("photos[]", file));

      await api.post(`/schools/${schoolId}/events/${eventId}/recap`, formData);
      setPhotoFiles([]);
      setPublishNow(false);
      await reload();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setSubmitError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible d'enregistrer le récap.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePhoto(photoId) {
    await api.delete(
      `/schools/${schoolId}/events/${eventId}/recap/photos/${photoId}`,
    );
    await reload();
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/dashboard/events")}
        sx={{ mb: 2 }}
      >
        Retour aux événements
      </Button>

      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        {recap?.event?.title
          ? `Récap — ${recap.event?.title}`
          : "Récap de l’événement"}
      </Typography>
      {recap?.published_at && (
        <Chip
          label={`Publié le ${formatDate(recap.published_at)}`}
          color="primary"
          size="small"
          sx={{ mb: 2 }}
        />
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !recap && !canManage && (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          Aucun récap disponible pour le moment.
        </Typography>
      )}

      {!loading && recap && (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {recap.summary && !canManage && (
            <Typography sx={{ whiteSpace: "pre-wrap" }}>
              {recap.summary}
            </Typography>
          )}
          {recap.video_url && !canManage && (
            <Button
              startIcon={<OndemandVideoIcon />}
              variant="outlined"
              href={recap.video_url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ alignSelf: "flex-start" }}
            >
              Voir la vidéo
            </Button>
          )}
          {recap.photos?.length > 0 && (
            <ImageList cols={3} gap={8} sx={{ m: 0 }}>
              {recap.photos.map((photo) => (
                <ImageListItem key={photo.id}>
                  <img
                    src={photo.url}
                    alt=""
                    loading="lazy"
                    style={{ borderRadius: 8 }}
                  />
                  {canManage && (
                    <ImageListItemBar
                      sx={{ background: "transparent" }}
                      position="top"
                      actionIcon={
                        <IconButton
                          size="small"
                          sx={{ color: "common.white" }}
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    />
                  )}
                </ImageListItem>
              ))}
            </ImageList>
          )}
        </Stack>
      )}

      {canManage && (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            {recap ? "Modifier le récap" : "Créer le récap"}
          </Typography>
          <Stack spacing={2}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              label="Résumé / remerciement"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              multiline
              rows={4}
              fullWidth
            />
            <TextField
              label="Lien vidéo (optionnel)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
              fullWidth
            />
            <Button
              component="label"
              variant="outlined"
              sx={{ alignSelf: "flex-start" }}
            >
              Ajouter des photos
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) =>
                  setPhotoFiles(Array.from(e.target.files ?? []))
                }
              />
            </Button>
            {photoFiles.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {photoFiles.length} photo(s) sélectionnée(s)
              </Typography>
            )}
            {!recap?.published_at && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={publishNow}
                    onChange={(e) => setPublishNow(e.target.checked)}
                  />
                }
                label="Publier maintenant (visible par tous, une notification sera envoyée)"
              />
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ alignSelf: "flex-start" }}
            >
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
