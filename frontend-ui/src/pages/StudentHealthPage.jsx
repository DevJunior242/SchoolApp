import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';
import { useSchools } from '../hooks/useSchools.js';

const MANAGER_ROLE_SLUGS = ['directeur', 'infirmier'];

const DOCUMENT_TYPE_OPTIONS = [
  { value: 1, label: 'Certificat médical' },
  { value: 2, label: 'Carnet de vaccination' },
  { value: 3, label: 'Ordonnance' },
  { value: 4, label: 'Compte rendu médical' },
];

const DOCUMENT_TYPE_LABELS = Object.fromEntries(DOCUMENT_TYPE_OPTIONS.map((t) => [t.value, t.label]));

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

const EXTENSION_BY_MIME = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/**
 * `window.open(URL.createObjectURL(...))` après un `await` ouvre parfois un
 * onglet vide : le navigateur ne relie plus la fenêtre au geste utilisateur
 * d'origine une fois l'appel asynchrone terminé. Un <a download> déclenché
 * par script évite ce problème de blocage de popup.
 */
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

function AllergyAlert({ allergies }) {
  if (!allergies || allergies.length === 0) return null;

  return (
    <Stack spacing={1} sx={{ mb: 3 }}>
      {allergies.map((a) => (
        <Alert key={a.id} severity={a.severity === 2 ? 'error' : 'warning'} icon={<WarningAmberIcon />}>
          <strong>ALLERGIE : {a.label}</strong>
          {a.notes ? ` — ${a.notes}` : ''}
        </Alert>
      ))}
    </Stack>
  );
}

export default function StudentHealthPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { schoolUsers } = useSchools();
  const currentRole = schoolUsers.find((su) => su.school.id === schoolId)?.role?.slug;
  const canManage = MANAGER_ROLE_SLUGS.includes(currentRole);
  const isTeacherOnly = currentRole === 'professeur';

  const base = schoolId ? `/schools/${schoolId}/students/${studentId}/health` : null;

  const [tab, setTab] = useState('profile');

  const { data: profile, error: profileError, reload: reloadProfile } = useApiGet(
    !isTeacherOnly ? base && `${base}/profile` : null
  );
  const { data: allergies, reload: reloadAllergies } = useApiGet(base && `${base}/allergies`);
  const { data: vaccinations, reload: reloadVaccinations } = useApiGet(
    !isTeacherOnly ? base && `${base}/vaccinations` : null
  );
  const { data: visits, reload: reloadVisits } = useApiGet(!isTeacherOnly ? base && `${base}/visits` : null);
  const { data: medications, reload: reloadMedications } = useApiGet(
    !isTeacherOnly ? base && `${base}/medications` : null
  );
  const { data: documents, reload: reloadDocuments } = useApiGet(
    !isTeacherOnly ? base && `${base}/documents` : null
  );

  const [profileForm, setProfileForm] = useState(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileLoadedForStudentId, setProfileLoadedForStudentId] = useState(null);

  // Ajustement pendant le rendu plutôt qu'un useEffect (pattern React
  // recommandé) : re-synchronise si on navigue d'une fiche élève à une
  // autre sans démontage (même route, juste :studentId qui change).
  if (profile && profileLoadedForStudentId !== studentId) {
    setProfileLoadedForStudentId(studentId);
    setProfileForm({
      blood_type: profile.blood_type ?? '',
      chronic_conditions: profile.chronic_conditions ?? '',
      disability: profile.disability ?? '',
      doctor_name: profile.doctor_name ?? '',
      doctor_phone: profile.doctor_phone ?? '',
      emergency_contact_name: profile.emergency_contact_name ?? '',
      emergency_contact_phone: profile.emergency_contact_phone ?? '',
      emergency_contact_phone2: profile.emergency_contact_phone2 ?? '',
      emergency_contact_relationship: profile.emergency_contact_relationship ?? '',
      preferred_hospital: profile.preferred_hospital ?? '',
    });
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileSubmitting(true);
    try {
      await api.put(`${base}/profile`, profileForm);
      await reloadProfile();
    } finally {
      setProfileSubmitting(false);
    }
  }

  // --- Allergies ---
  const [allergyDialogOpen, setAllergyDialogOpen] = useState(false);
  const [allergyForm, setAllergyForm] = useState({ label: '', severity: 1, notes: '' });

  async function handleAddAllergy(e) {
    e.preventDefault();
    await api.post(`${base}/allergies`, allergyForm);
    setAllergyDialogOpen(false);
    setAllergyForm({ label: '', severity: 1, notes: '' });
    await reloadAllergies();
  }

  async function handleDeleteAllergy(id) {
    await api.delete(`${base}/allergies/${id}`);
    await reloadAllergies();
  }

  // --- Vaccinations ---
  const [vaccinationDialogOpen, setVaccinationDialogOpen] = useState(false);
  const [vaccinationForm, setVaccinationForm] = useState({
    name: '', administered_at: '', expires_at: '', next_dose_at: '',
  });
  const [vaccinationFile, setVaccinationFile] = useState(null);

  async function handleAddVaccination(e) {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(vaccinationForm).forEach(([key, value]) => formData.append(key, value ?? ''));
    if (vaccinationFile) formData.append('document', vaccinationFile);
    await api.post(`${base}/vaccinations`, formData);
    setVaccinationDialogOpen(false);
    setVaccinationForm({ name: '', administered_at: '', expires_at: '', next_dose_at: '' });
    setVaccinationFile(null);
    await reloadVaccinations();
  }

  async function handleDeleteVaccination(id) {
    await api.delete(`${base}/vaccinations/${id}`);
    await reloadVaccinations();
  }

  async function handleDownloadVaccinationDocument(vaccination) {
    const response = await api.get(`${base}/vaccinations/${vaccination.id}/document`, { responseType: 'blob' });
    const ext = EXTENSION_BY_MIME[response.data.type] ?? 'pdf';
    downloadBlob(response.data, `vaccin-${vaccination.name}.${ext}`.replace(/\s+/g, '-'));
  }

  // --- Visites médicales ---
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [visitForm, setVisitForm] = useState({
    visited_at: '', reason: '', diagnosis: '', treatment_given: '',
    rest_recommended: false, is_emergency: false, returned_to_class_at: '',
  });

  async function handleAddVisit(e) {
    e.preventDefault();
    await api.post(`${base}/visits`, visitForm);
    setVisitDialogOpen(false);
    setVisitForm({
      visited_at: '', reason: '', diagnosis: '', treatment_given: '',
      rest_recommended: false, is_emergency: false, returned_to_class_at: '',
    });
    await reloadVisits();
  }

  // --- Traitements ---
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [medicationForm, setMedicationForm] = useState({
    name: '', dosage: '', starts_on: '', ends_on: '', notes: '', parent_authorized: false,
  });

  async function handleAddMedication(e) {
    e.preventDefault();
    await api.post(`${base}/medications`, medicationForm);
    setMedicationDialogOpen(false);
    setMedicationForm({ name: '', dosage: '', starts_on: '', ends_on: '', notes: '', parent_authorized: false });
    await reloadMedications();
  }

  async function handleDeleteMedication(id) {
    await api.delete(`${base}/medications/${id}`);
    await reloadMedications();
  }

  // --- Documents ---
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState({ type: 1, label: '' });
  const [documentFile, setDocumentFile] = useState(null);

  async function handleAddDocument(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('type', documentForm.type);
    formData.append('label', documentForm.label);
    formData.append('file', documentFile);
    await api.post(`${base}/documents`, formData);
    setDocumentDialogOpen(false);
    setDocumentForm({ type: 1, label: '' });
    setDocumentFile(null);
    await reloadDocuments();
  }

  async function handleDeleteDocument(id) {
    await api.delete(`${base}/documents/${id}`);
    await reloadDocuments();
  }

  async function handleDownloadDocument(document_) {
    const response = await api.get(`${base}/documents/${document_.id}/download`, { responseType: 'blob' });
    const ext = EXTENSION_BY_MIME[response.data.type] ?? 'pdf';
    const name = document_.label || DOCUMENT_TYPE_LABELS[document_.type];
    downloadBlob(response.data, `${name}.${ext}`.replace(/\s+/g, '-'));
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  // Le professeur n'a droit qu'à l'alerte allergie, pas au reste du dossier.
  if (isTeacherOnly) {
    return (
      <Box sx={{ maxWidth: 640, mx: 'auto' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          Retour
        </Button>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          Alerte santé
        </Typography>
        {(allergies ?? []).length === 0 ? (
          <Typography color="text.secondary">Aucune allergie connue pour cet élève.</Typography>
        ) : (
          <AllergyAlert allergies={allergies} />
        )}
      </Box>
    );
  }

  if (profileError) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Alert severity="error" sx={{ display: 'inline-flex' }}>
          {profileError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Retour
      </Button>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Fiche santé
      </Typography>

      <AllergyAlert allergies={allergies} />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable">
        <Tab value="profile" label="Profil" />
        <Tab value="allergies" label="Allergies" />
        <Tab value="vaccinations" label="Vaccinations" />
        <Tab value="visits" label="Visites" />
        <Tab value="medications" label="Traitements" />
        <Tab value="documents" label="Documents" />
      </Tabs>

      {tab === 'profile' && profileForm && (
        <Box component="form" onSubmit={handleSaveProfile}>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <TextField
              label="Groupe sanguin"
              value={profileForm.blood_type}
              onChange={(e) => setProfileForm((p) => ({ ...p, blood_type: e.target.value }))}
              disabled={!canManage}
              fullWidth
            />
            <TextField
              label="Maladies chroniques"
              value={profileForm.chronic_conditions}
              onChange={(e) => setProfileForm((p) => ({ ...p, chronic_conditions: e.target.value }))}
              disabled={!canManage}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Handicap (optionnel)"
              value={profileForm.disability}
              onChange={(e) => setProfileForm((p) => ({ ...p, disability: e.target.value }))}
              disabled={!canManage}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Médecin traitant"
              value={profileForm.doctor_name}
              onChange={(e) => setProfileForm((p) => ({ ...p, doctor_name: e.target.value }))}
              disabled={!canManage}
              fullWidth
            />
            <TextField
              label="Téléphone du médecin"
              value={profileForm.doctor_phone}
              onChange={(e) => setProfileForm((p) => ({ ...p, doctor_phone: e.target.value }))}
              disabled={!canManage}
              fullWidth
            />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>
              Urgence
            </Typography>
            <TextField
              label="Personne à contacter"
              value={profileForm.emergency_contact_name}
              onChange={(e) => setProfileForm((p) => ({ ...p, emergency_contact_name: e.target.value }))}
              disabled={!canManage}
              fullWidth
            />
            <TextField
              label="Téléphone 1"
              value={profileForm.emergency_contact_phone}
              onChange={(e) => setProfileForm((p) => ({ ...p, emergency_contact_phone: e.target.value }))}
              disabled={!canManage}
              fullWidth
            />
            <TextField
              label="Téléphone 2 (optionnel)"
              value={profileForm.emergency_contact_phone2}
              onChange={(e) => setProfileForm((p) => ({ ...p, emergency_contact_phone2: e.target.value }))}
              disabled={!canManage}
              fullWidth
            />
            <TextField
              label="Lien de parenté"
              value={profileForm.emergency_contact_relationship}
              onChange={(e) => setProfileForm((p) => ({ ...p, emergency_contact_relationship: e.target.value }))}
              disabled={!canManage}
              fullWidth
            />
            <TextField
              label="Hôpital préféré (optionnel)"
              value={profileForm.preferred_hospital}
              onChange={(e) => setProfileForm((p) => ({ ...p, preferred_hospital: e.target.value }))}
              disabled={!canManage}
              fullWidth
            />
            {canManage && (
              <Button type="submit" variant="contained" disabled={profileSubmitting} sx={{ alignSelf: 'flex-start' }}>
                {profileSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {tab === 'allergies' && (
        <Box>
          {canManage && (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setAllergyDialogOpen(true)} sx={{ mb: 2 }}>
              Ajouter une allergie
            </Button>
          )}
          <Stack spacing={1.5}>
            {(allergies ?? []).map((a) => (
              <Card key={a.id} variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1">{a.label}</Typography>
                      <Chip
                        label={a.severity === 2 ? 'Sévère' : 'Léger'}
                        size="small"
                        color={a.severity === 2 ? 'error' : 'warning'}
                      />
                    </Stack>
                    {a.notes && <Typography variant="body2" color="text.secondary">{a.notes}</Typography>}
                  </Box>
                  {canManage && (
                    <IconButton size="small" onClick={() => handleDeleteAllergy(a.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </CardContent>
              </Card>
            ))}
            {(allergies ?? []).length === 0 && <Typography color="text.secondary">Aucune allergie connue.</Typography>}
          </Stack>
        </Box>
      )}

      {tab === 'vaccinations' && (
        <Box>
          {canManage && (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setVaccinationDialogOpen(true)} sx={{ mb: 2 }}>
              Ajouter un vaccin
            </Button>
          )}
          <Stack spacing={1.5}>
            {(vaccinations ?? []).map((v) => (
              <Card key={v.id} variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1">{v.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Administré le {formatDate(v.administered_at)}
                      {v.expires_at ? ` · expire le ${formatDate(v.expires_at)}` : ''}
                      {v.next_dose_at ? ` · prochaine dose le ${formatDate(v.next_dose_at)}` : ''}
                    </Typography>
                  </Box>
                  {v.has_document && (
                    <IconButton size="small" onClick={() => handleDownloadVaccinationDocument(v)}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  )}
                  {canManage && (
                    <IconButton size="small" onClick={() => handleDeleteVaccination(v.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </CardContent>
              </Card>
            ))}
            {(vaccinations ?? []).length === 0 && <Typography color="text.secondary">Aucun vaccin enregistré.</Typography>}
          </Stack>
        </Box>
      )}

      {tab === 'visits' && (
        <Box>
          {canManage && (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setVisitDialogOpen(true)} sx={{ mb: 2 }}>
              Enregistrer une visite
            </Button>
          )}
          <Stack spacing={1.5}>
            {(visits ?? []).map((v) => (
              <Card key={v.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle1">{v.reason}</Typography>
                    {v.is_emergency && <Chip label="Urgence" size="small" color="error" />}
                    {v.rest_recommended && <Chip label="Repos conseillé" size="small" variant="outlined" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(v.visited_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                    {v.recorder ? ` · ${v.recorder.fullname}` : ''}
                  </Typography>
                  {v.diagnosis && <Typography variant="body2" sx={{ mt: 1 }}>Diagnostic : {v.diagnosis}</Typography>}
                  {v.treatment_given && <Typography variant="body2">Traitement : {v.treatment_given}</Typography>}
                  {v.returned_to_class_at && (
                    <Typography variant="body2">
                      Retour en classe : {new Date(v.returned_to_class_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
            {(visits ?? []).length === 0 && <Typography color="text.secondary">Aucune visite enregistrée.</Typography>}
          </Stack>
        </Box>
      )}

      {tab === 'medications' && (
        <Box>
          {canManage && (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setMedicationDialogOpen(true)} sx={{ mb: 2 }}>
              Ajouter un traitement
            </Button>
          )}
          <Stack spacing={1.5}>
            {(medications ?? []).map((m) => (
              <Card key={m.id} variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1">{m.name}</Typography>
                      <Chip
                        label={m.parent_authorized ? 'Autorisé par les parents' : 'Non autorisé'}
                        size="small"
                        color={m.parent_authorized ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {m.dosage} · du {formatDate(m.starts_on)}{m.ends_on ? ` au ${formatDate(m.ends_on)}` : ''}
                    </Typography>
                    {m.notes && <Typography variant="body2">{m.notes}</Typography>}
                  </Box>
                  {canManage && (
                    <IconButton size="small" onClick={() => handleDeleteMedication(m.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </CardContent>
              </Card>
            ))}
            {(medications ?? []).length === 0 && <Typography color="text.secondary">Aucun traitement en cours.</Typography>}
          </Stack>
        </Box>
      )}

      {tab === 'documents' && (
        <Box>
          {canManage && (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDocumentDialogOpen(true)} sx={{ mb: 2 }}>
              Déposer un document
            </Button>
          )}
          <Stack spacing={1.5}>
            {(documents ?? []).map((d) => (
              <Card key={d.id} variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1">{d.label || DOCUMENT_TYPE_LABELS[d.type]}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {DOCUMENT_TYPE_LABELS[d.type]} · {formatDate(d.created_at)}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleDownloadDocument(d)}>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  {canManage && (
                    <IconButton size="small" onClick={() => handleDeleteDocument(d.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </CardContent>
              </Card>
            ))}
            {(documents ?? []).length === 0 && <Typography color="text.secondary">Aucun document déposé.</Typography>}
          </Stack>
        </Box>
      )}

      {/* Dialogs */}
      <Dialog open={allergyDialogOpen} onClose={() => setAllergyDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter une allergie</DialogTitle>
        <Box component="form" onSubmit={handleAddAllergy}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Allergène"
              value={allergyForm.label}
              onChange={(e) => setAllergyForm((p) => ({ ...p, label: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Sévérité"
              value={allergyForm.severity}
              onChange={(e) => setAllergyForm((p) => ({ ...p, severity: Number(e.target.value) }))}
              fullWidth
            >
              <MenuItem value={1}>Léger</MenuItem>
              <MenuItem value={2}>Sévère</MenuItem>
            </TextField>
            <TextField
              label="Notes (optionnel)"
              value={allergyForm.notes}
              onChange={(e) => setAllergyForm((p) => ({ ...p, notes: e.target.value }))}
              multiline
              rows={2}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAllergyDialogOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained">Ajouter</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={vaccinationDialogOpen} onClose={() => setVaccinationDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter un vaccin</DialogTitle>
        <Box component="form" onSubmit={handleAddVaccination}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nom du vaccin"
              value={vaccinationForm.name}
              onChange={(e) => setVaccinationForm((p) => ({ ...p, name: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Date d'administration"
              type="date"
              value={vaccinationForm.administered_at}
              onChange={(e) => setVaccinationForm((p) => ({ ...p, administered_at: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              required
              fullWidth
            />
            <TextField
              label="Date d'expiration (optionnel)"
              type="date"
              value={vaccinationForm.expires_at}
              onChange={(e) => setVaccinationForm((p) => ({ ...p, expires_at: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Prochaine dose (optionnel)"
              type="date"
              value={vaccinationForm.next_dose_at}
              onChange={(e) => setVaccinationForm((p) => ({ ...p, next_dose_at: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <Button component="label" variant="outlined">
              Document justificatif (optionnel)
              <input type="file" accept="application/pdf,image/*" hidden onChange={(e) => setVaccinationFile(e.target.files?.[0] ?? null)} />
            </Button>
            {vaccinationFile && <Typography variant="body2" color="text.secondary">{vaccinationFile.name}</Typography>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setVaccinationDialogOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained">Ajouter</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={visitDialogOpen} onClose={() => setVisitDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Enregistrer une visite</DialogTitle>
        <Box component="form" onSubmit={handleAddVisit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Date et heure"
              type="datetime-local"
              value={visitForm.visited_at}
              onChange={(e) => setVisitForm((p) => ({ ...p, visited_at: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Motif"
              value={visitForm.reason}
              onChange={(e) => setVisitForm((p) => ({ ...p, reason: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Diagnostic (optionnel)"
              value={visitForm.diagnosis}
              onChange={(e) => setVisitForm((p) => ({ ...p, diagnosis: e.target.value }))}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Traitement donné (optionnel)"
              value={visitForm.treatment_given}
              onChange={(e) => setVisitForm((p) => ({ ...p, treatment_given: e.target.value }))}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Retour en classe (optionnel)"
              type="datetime-local"
              value={visitForm.returned_to_class_at}
              onChange={(e) => setVisitForm((p) => ({ ...p, returned_to_class_at: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={visitForm.rest_recommended}
                  onChange={(e) => setVisitForm((p) => ({ ...p, rest_recommended: e.target.checked }))}
                />
              }
              label="Repos conseillé"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={visitForm.is_emergency}
                  onChange={(e) => setVisitForm((p) => ({ ...p, is_emergency: e.target.checked }))}
                />
              }
              label="Cas d'urgence"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setVisitDialogOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained">Enregistrer</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={medicationDialogOpen} onClose={() => setMedicationDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter un traitement</DialogTitle>
        <Box component="form" onSubmit={handleAddMedication}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Médicament"
              value={medicationForm.name}
              onChange={(e) => setMedicationForm((p) => ({ ...p, name: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Posologie"
              value={medicationForm.dosage}
              onChange={(e) => setMedicationForm((p) => ({ ...p, dosage: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Début"
              type="date"
              value={medicationForm.starts_on}
              onChange={(e) => setMedicationForm((p) => ({ ...p, starts_on: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              required
              fullWidth
            />
            <TextField
              label="Fin (optionnel)"
              type="date"
              value={medicationForm.ends_on}
              onChange={(e) => setMedicationForm((p) => ({ ...p, ends_on: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Observations (optionnel)"
              value={medicationForm.notes}
              onChange={(e) => setMedicationForm((p) => ({ ...p, notes: e.target.value }))}
              multiline
              rows={2}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={medicationForm.parent_authorized}
                  onChange={(e) => setMedicationForm((p) => ({ ...p, parent_authorized: e.target.checked }))}
                />
              }
              label="Autorisation des parents"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setMedicationDialogOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained">Ajouter</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={documentDialogOpen} onClose={() => setDocumentDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Déposer un document</DialogTitle>
        <Box component="form" onSubmit={handleAddDocument}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Type"
              value={documentForm.type}
              onChange={(e) => setDocumentForm((p) => ({ ...p, type: Number(e.target.value) }))}
              fullWidth
            >
              {DOCUMENT_TYPE_OPTIONS.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Libellé (optionnel)"
              value={documentForm.label}
              onChange={(e) => setDocumentForm((p) => ({ ...p, label: e.target.value }))}
              fullWidth
            />
            <Button component="label" variant="outlined">
              Choisir un fichier
              <input type="file" accept="application/pdf,image/*" hidden required onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} />
            </Button>
            {documentFile && <Typography variant="body2" color="text.secondary">{documentFile.name}</Typography>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDocumentDialogOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={!documentFile}>Déposer</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
