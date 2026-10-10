import { useState } from "react";
import { Alert, FormControlLabel, Paper, Switch, Typography } from "@mui/material";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { notifySchoolMembershipsChanged, useSchools } from "../hooks/useSchools.js";
import { getApiErrorMessage } from "../utils/apiData.js";

// Réservé au créateur de l'école : indique s'il travaille aussi comme
// salarié (menus « Mon pointage » / « Ma paie » et droit de pointer).
export default function OwnerStaffStatusCard() {
  const { user } = useAuth();
  const { schoolUsers, reload } = useSchools();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const membership = schoolUsers.find(
    (schoolUser) => schoolUser.school?.id === user.current_school_id,
  );

  if (!membership?.is_owner || membership.role?.slug !== "admin") return null;

  async function handleChange(event) {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/schools/${membership.school.id}/my-staff-status`, {
        is_staff: event.target.checked,
      });
      await reload();
      notifySchoolMembershipsChanged();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible d’enregistrer ce réglage."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 560, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Mon rôle dans l’école
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(membership.is_staff)}
            onChange={handleChange}
            disabled={saving}
          />
        }
        label="Je travaille aussi comme salarié de l’école"
      />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Activez-le si vous êtes aussi employé de l’école (par exemple fondateur et
        directeur payé) : vous aurez alors « Mon pointage » et « Ma paie » dans le
        menu, et vous pourrez pointer comme le reste du personnel.
      </Typography>
    </Paper>
  );
}
