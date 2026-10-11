import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api/axios.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { asArray, getApiErrorMessage } from "../utils/apiData.js";
import { bulletinFileName, downloadBulletinsPdf } from "../utils/bulletinPdf.js";

// Bulletins de toute une classe en un seul PDF (une page par élève), selon
// le modèle de bulletin de la section.
export default function ClassBulletinsDialog({ schoolId, schoolClass, onClose }) {
  const { data: seasons } = useApiGet(schoolId ? `/schools/${schoolId}/seasons` : null);
  const [seasonId, setSeasonId] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  async function handleDownload() {
    setWorking(true);
    setError(null);
    try {
      const response = await api.get(
        `/schools/${schoolId}/classes/${schoolClass.id}/bulletins`,
        { params: seasonId ? { season_id: seasonId } : {} },
      );
      const bulletins = asArray(response.data?.bulletins);
      if (bulletins.length === 0) {
        setError("Aucun élève inscrit dans cette classe.");
        return;
      }
      await downloadBulletinsPdf(bulletins, bulletinFileName(bulletins[0], `classe ${schoolClass.name}`));
      onClose();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible de préparer les bulletins."));
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={Boolean(schoolClass)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Bulletins — {schoolClass?.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Un seul PDF avec le bulletin de chaque élève (une page par élève), prêt à imprimer.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          select
          fullWidth
          label="Période"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
        >
          <MenuItem value="">Année complète</MenuItem>
          {asArray(seasons).map((season) => (
            <MenuItem key={season.id} value={season.id}>
              {season.label}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={handleDownload} disabled={working}>
          {working ? "Préparation..." : "Télécharger le PDF"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
