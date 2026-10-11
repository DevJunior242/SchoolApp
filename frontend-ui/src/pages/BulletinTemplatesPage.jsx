import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { asArray, asObject, getApiErrorMessage } from "../utils/apiData.js";

const EVALUATION_LABELS = {
  interrogation: "Interrogation",
  devoir: "Devoir",
  composition: "Composition",
  examen: "Examen",
};

const COLUMN_OPTIONS = [
  ["show_teacher", "Nom du professeur"],
  ["show_coefficient", "Coefficient et moyenne × coef."],
  ["show_class_average", "Moyenne de la classe"],
  ["show_min_max", "Plus forte et plus faible moyenne"],
  ["show_subject_rank", "Rang dans chaque matière"],
  ["show_rank", "Rang général dans la classe"],
  ["show_appreciations", "Appréciations des professeurs et du titulaire"],
  ["show_attendance", "Absences et retards de la période"],
];

// Formulaire du modèle d'une section : on repart des valeurs du serveur à
// chaque changement d'onglet (key = id de la section).
function TemplateForm({ schoolId, entry, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...entry.template,
    pass_threshold: entry.template.pass_threshold ?? "",
    header_lines: asArray(entry.template.header_lines),
    signatures: asArray(entry.template.signatures),
    distinctions: asArray(entry.template.distinctions),
    motto: entry.template.motto ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const scale = Number(form.grading_scale) || 20;

  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const updateListItem = (field, index, value) =>
    update(field, form[field].map((item, i) => (i === index ? value : item)));
  const removeListItem = (field, index) =>
    update(field, form[field].filter((_, i) => i !== index));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.put(`/schools/${schoolId}/bulletin-templates/${entry.section.id}`, {
        ...form,
        pass_threshold: form.pass_threshold === "" ? null : Number(form.pass_threshold),
        motto: form.motto || null,
      });
      onSaved(`Modèle de bulletin « ${entry.section.name} » enregistré.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible d’enregistrer le modèle."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box component="form" onSubmit={save}>
      {!entry.customized && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Cette section utilise le modèle standard. Modifiez ce qui vous convient puis enregistrez.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Notation et calcul</Typography>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Barème du bulletin"
                  value={form.grading_scale}
                  onChange={(e) => update("grading_scale", Number(e.target.value))}
                  helperText="Les notes restent saisies telles quelles ; seul l’affichage du bulletin change."
                >
                  <MenuItem value={20}>Sur 20</MenuItem>
                  <MenuItem value={10}>Sur 10</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Calcul de la moyenne d’une matière"
                  value={form.calculation_mode}
                  onChange={(e) => update("calculation_mode", e.target.value)}
                >
                  <MenuItem value="grade_coefficient">Coefficient saisi par le professeur pour chaque note</MenuItem>
                  <MenuItem value="type_weights">Poids fixé par type d’évaluation</MenuItem>
                </TextField>
                {form.calculation_mode === "type_weights" && (
                  <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                    {Object.entries(EVALUATION_LABELS).map(([type, label]) => (
                      <TextField
                        key={type}
                        size="small"
                        type="number"
                        label={label}
                        value={form.evaluation_weights?.[type] ?? 1}
                        onChange={(e) =>
                          update("evaluation_weights", { ...form.evaluation_weights, [type]: Number(e.target.value) })
                        }
                        slotProps={{ htmlInput: { min: 0, max: 10, step: 0.5 } }}
                        sx={{ width: 130 }}
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Décision de fin d’année</Typography>
              <Stack spacing={2}>
                <TextField
                  type="number"
                  label={`Seuil de passage (sur ${scale})`}
                  value={form.pass_threshold}
                  onChange={(e) => update("pass_threshold", e.target.value)}
                  helperText={`Vide = la moitié du barème (${scale / 2}).`}
                  slotProps={{ htmlInput: { min: 0, max: scale, step: 0.25 } }}
                />
                <TextField
                  label="Libellé si la moyenne atteint le seuil"
                  value={form.pass_label ?? ""}
                  onChange={(e) => update("pass_label", e.target.value)}
                  required
                />
                <TextField
                  label="Libellé sinon"
                  value={form.fail_label ?? ""}
                  onChange={(e) => update("fail_label", e.target.value)}
                  required
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Distinctions et sanctions</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Vérifiées dans l’ordre : la première qui correspond à la moyenne générale s’affiche.
              </Typography>
              <Stack spacing={1}>
                {form.distinctions.map((distinction, index) => (
                  <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
                    <TextField
                      size="small"
                      label="Libellé"
                      value={distinction.label}
                      onChange={(e) => updateListItem("distinctions", index, { ...distinction, label: e.target.value })}
                      required
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      select
                      size="small"
                      value={distinction.condition}
                      onChange={(e) => updateListItem("distinctions", index, { ...distinction, condition: e.target.value })}
                      sx={{ width: 150 }}
                    >
                      <MenuItem value="gte">moyenne ≥</MenuItem>
                      <MenuItem value="lt">moyenne &lt;</MenuItem>
                    </TextField>
                    <TextField
                      size="small"
                      type="number"
                      value={distinction.value}
                      onChange={(e) => updateListItem("distinctions", index, { ...distinction, value: Number(e.target.value) })}
                      slotProps={{ htmlInput: { min: 0, max: scale, step: 0.25 } }}
                      sx={{ width: 90 }}
                    />
                    <IconButton aria-label="Retirer" onClick={() => removeListItem("distinctions", index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => update("distinctions", [...form.distinctions, { label: "", condition: "gte", value: scale / 2 }])}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Ajouter
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Colonnes et informations</Typography>
              <Stack>
                {COLUMN_OPTIONS.map(([field, label]) => (
                  <FormControlLabel
                    key={field}
                    control={<Checkbox checked={Boolean(form[field])} onChange={(e) => update(field, e.target.checked)} />}
                    label={label}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>En-tête et signatures</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Lignes affichées au-dessus du nom de l’école (ministère, direction régionale…). Le logo est celui des réglages de l’école.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    {form.header_lines.map((line, index) => (
                      <Stack key={index} direction="row" spacing={1}>
                        <TextField
                          size="small"
                          fullWidth
                          label={`Ligne ${index + 1}`}
                          value={line}
                          onChange={(e) => updateListItem("header_lines", index, e.target.value)}
                        />
                        <IconButton aria-label="Retirer" onClick={() => removeListItem("header_lines", index)}>
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    ))}
                    {form.header_lines.length < 6 && (
                      <Button startIcon={<AddIcon />} onClick={() => update("header_lines", [...form.header_lines, ""])} sx={{ alignSelf: "flex-start" }}>
                        Ajouter une ligne d’en-tête
                      </Button>
                    )}
                    <TextField
                      size="small"
                      label="Devise ou slogan (facultatif)"
                      value={form.motto}
                      onChange={(e) => update("motto", e.target.value)}
                    />
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    {form.signatures.map((label, index) => (
                      <Stack key={index} direction="row" spacing={1}>
                        <TextField
                          size="small"
                          fullWidth
                          label={`Signature ${index + 1}`}
                          value={label}
                          onChange={(e) => updateListItem("signatures", index, e.target.value)}
                        />
                        <IconButton aria-label="Retirer" onClick={() => removeListItem("signatures", index)}>
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    ))}
                    {form.signatures.length < 4 && (
                      <Button startIcon={<AddIcon />} onClick={() => update("signatures", [...form.signatures, ""])} sx={{ alignSelf: "flex-start" }}>
                        Ajouter une case de signature
                      </Button>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2 }}>
        <Button type="submit" variant="contained" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer le modèle"}
        </Button>
      </Box>
    </Box>
  );
}

export default function BulletinTemplatesPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const { data, loading, error, reload } = useApiGet(
    schoolId ? `/schools/${schoolId}/bulletin-templates` : null,
  );
  const entries = asArray(asObject(data)?.sections);
  const [tab, setTab] = useState(0);
  const [saved, setSaved] = useState(null);
  const current = entries[Math.min(tab, entries.length - 1)];

  if (!schoolId) return <Alert severity="info">Aucune école active.</Alert>;
  if (loading) return <LinearProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Modèles de bulletin
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Chaque section a son propre bulletin : barème, calcul, distinctions, décision de fin d’année, en-tête et signatures.
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(null)}>
          {saved}
        </Alert>
      )}

      {entries.length === 0 ? (
        <Alert severity="info">Aucune section active dans cette école.</Alert>
      ) : (
        <>
          <Tabs value={Math.min(tab, entries.length - 1)} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 2 }}>
            {entries.map((entry) => (
              <Tab key={entry.section.id} label={entry.section.name} />
            ))}
          </Tabs>
          {current && (
            <TemplateForm
              key={`${current.section.id}-${current.customized}`}
              schoolId={schoolId}
              entry={current}
              onSaved={(message) => {
                setSaved(message);
                reload();
              }}
            />
          )}
        </>
      )}
    </Box>
  );
}
