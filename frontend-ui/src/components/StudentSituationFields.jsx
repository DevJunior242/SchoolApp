import { Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DISABILITY_TYPES } from "../utils/studentSituation.js";

// Situation de l'élève demandée par l'inspection (PDI, handicap,
// redoublant). Données sensibles : seule l'administration les voit.
export default function StudentSituationFields({ value, onChange }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        Situation (rapport pour l’inspection, visible seulement par l’administration)
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(value.is_displaced)}
              onChange={(e) => onChange("is_displaced", e.target.checked)}
            />
          }
          label="Élève déplacé interne (PDI)"
          sx={{ minWidth: 240 }}
        />
        {value.is_displaced && (
          <TextField
            size="small"
            label="Commune / province d’origine"
            value={value.displaced_origin || ""}
            onChange={(e) => onChange("displaced_origin", e.target.value)}
            fullWidth
          />
        )}
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(value.has_disability)}
              onChange={(e) => onChange("has_disability", e.target.checked)}
            />
          }
          label="En situation de handicap"
          sx={{ minWidth: 240 }}
        />
        {value.has_disability && (
          <TextField
            select
            size="small"
            label="Type de handicap"
            value={value.disability_type || ""}
            onChange={(e) => onChange("disability_type", e.target.value)}
            fullWidth
          >
            {DISABILITY_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
      <FormControlLabel
        control={
          <Checkbox
            checked={Boolean(value.is_repeating)}
            onChange={(e) => onChange("is_repeating", e.target.checked)}
          />
        }
        label="Redoublant cette année"
      />
    </Stack>
  );
}
