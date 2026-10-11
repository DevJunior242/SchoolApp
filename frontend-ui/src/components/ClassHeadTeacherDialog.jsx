import { useMemo, useState } from "react";
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
import { asArray, getApiErrorMessage } from "../utils/apiData.js";

// Choix du professeur titulaire d'une classe, parmi ceux qui y enseignent :
// il écrit l'appréciation générale des bulletins.
export default function ClassHeadTeacherDialog({ schoolId, schoolClass, onClose, onSaved }) {
  const teachers = useMemo(() => {
    const byId = new Map();
    for (const assignment of asArray(schoolClass?.class_subject_teachers)) {
      if (assignment.teacher) byId.set(assignment.teacher.id, assignment.teacher);
    }
    return [...byId.values()].sort((a, b) => (a.fullname ?? "").localeCompare(b.fullname ?? ""));
  }, [schoolClass]);
  const [userId, setUserId] = useState(schoolClass?.head_teacher_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/schools/${schoolId}/classes/${schoolClass.id}/head-teacher`, {
        user_id: userId || null,
      });
      onSaved();
      onClose();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible d’enregistrer le titulaire."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(schoolClass)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Titulaire — {schoolClass?.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Le titulaire écrit l’appréciation générale des bulletins et son nom figure sur le bulletin.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {teachers.length === 0 ? (
          <Alert severity="info">Ajoutez d’abord des professeurs à cette classe.</Alert>
        ) : (
          <TextField select fullWidth label="Professeur titulaire" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <MenuItem value="">Aucun</MenuItem>
            {teachers.map((teacher) => (
              <MenuItem key={teacher.id} value={teacher.id}>
                {teacher.fullname}
              </MenuItem>
            ))}
          </TextField>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={save} disabled={saving || teachers.length === 0}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
