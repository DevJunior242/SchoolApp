import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { asArray, asObject, getApiErrorMessage } from "../utils/apiData.js";

const MAX_LENGTH = 500;

// Saisie des appréciations du bulletin, pour toute la classe d'un coup :
// - /assignments/:assignmentId/appreciations : appréciation de la matière
//   (professeur du cours) ;
// - /head-classes/:classId/appreciations : appréciation générale (titulaire
//   de la classe ou administrateur).
export default function AppreciationsEntryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { assignmentId, classId } = useParams();
  const schoolId = user?.current_school_id;
  const isGeneral = Boolean(classId);
  const url = isGeneral
    ? `/schools/${schoolId}/classes/${classId}/appreciations`
    : `/assignments/${assignmentId}/appreciations`;

  const { data: assignmentData } = useApiGet(isGeneral ? null : `/assignments/${assignmentId}`);
  const assignment = asObject(assignmentData);
  const { data: seasons } = useApiGet(schoolId ? `/schools/${schoolId}/seasons` : null);

  const [chosenSeasonId, setSeasonId] = useState("");
  // Résultat du dernier chargement, repéré par sa clé (adresse + période) :
  // « en chargement » tant que la clé affichée n'est pas la clé demandée.
  const [loaded, setLoaded] = useState({ key: null, error: null });
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Par défaut : la période en cours (sinon la première).
  const seasonList = asArray(seasons);
  const today = new Date().toISOString().slice(0, 10);
  const seasonId =
    chosenSeasonId ||
    (seasonList.find((season) => season.start_date <= today && today <= season.end_date) ?? seasonList[0])?.id ||
    "";
  const params = seasonId === "annual" ? {} : { season_id: seasonId };
  const loadKey = seasonId ? `${url}|${seasonId}` : null;
  const loading = !loadKey || loaded.key !== loadKey;
  const error = saveError ?? (loading ? null : loaded.error);

  useEffect(() => {
    if (!loadKey) return;
    let cancelled = false;
    api
      .get(url, { params: seasonId === "annual" ? {} : { season_id: seasonId } })
      .then((response) => {
        if (cancelled) return;
        setRows(asArray(response.data));
        setLoaded({ key: loadKey, error: null });
      })
      .catch((requestError) => {
        if (cancelled) return;
        setRows([]);
        setLoaded({ key: loadKey, error: getApiErrorMessage(requestError, "Impossible de charger les appréciations.") });
      });
    return () => {
      cancelled = true;
    };
  }, [loadKey, url, seasonId]);

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSuccess(null);
    try {
      const response = await api.put(
        url,
        { items: rows.map((row) => ({ student_id: row.student_id, content: row.content })) },
        { params },
      );
      setRows(asArray(response.data));
      setSuccess("Appréciations enregistrées. Elles apparaissent sur les bulletins.");
    } catch (requestError) {
      setSaveError(getApiErrorMessage(requestError, "Impossible d’enregistrer les appréciations."));
    } finally {
      setSaving(false);
    }
  }

  const title = isGeneral
    ? "Appréciations générales"
    : `Appréciations — ${assignment?.subject?.name ?? "matière"}${assignment?.school_class?.name ? ` · ${assignment.school_class.name}` : ""}`;

  return (
    <Box>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ← Retour
      </Button>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {isGeneral
          ? "Un mot sur l’ensemble de la période pour chaque élève, imprimé en bas du bulletin."
          : "Un court commentaire par élève, imprimé à côté de la moyenne de la matière."}{" "}
        Laisser vide pour ne rien afficher.
      </Typography>

      <TextField
        select
        label="Période"
        value={seasonId}
        onChange={(e) => {
          setSeasonId(e.target.value);
          setSaveError(null);
          setSuccess(null);
        }}
        sx={{ mb: 2, minWidth: 240 }}
      >
        {asArray(seasons).map((season) => (
          <MenuItem key={season.id} value={season.id}>
            {season.label}
          </MenuItem>
        ))}
        <MenuItem value="annual">Bulletin annuel</MenuItem>
      </TextField>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {!loading && rows.length === 0 && !error && (
        <Alert severity="info">Aucun élève inscrit dans cette classe.</Alert>
      )}

      {rows.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              {rows.map((row, index) => (
                <TextField
                  key={row.student_id}
                  label={row.fullname}
                  value={row.content}
                  onChange={(e) =>
                    setRows((previous) =>
                      previous.map((item, i) => (i === index ? { ...item, content: e.target.value } : item)),
                    )
                  }
                  multiline
                  minRows={1}
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: MAX_LENGTH } }}
                  placeholder={isGeneral ? "Ex. Trimestre satisfaisant, continuez vos efforts." : "Ex. Bon travail, doit participer davantage."}
                />
              ))}
            </Stack>
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={save} disabled={saving || loading}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
