import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { motion } from 'motion/react';
import { Link as RouterLink } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';
import { useSchools } from '../hooks/useSchools.js';

const RELATIONSHIPS = [
  { value: 'pere', label: 'Père' },
  { value: 'mere', label: 'Mère' },
  { value: 'tuteur', label: 'Tuteur / Tutrice' },
  { value: 'autre', label: 'Autre' },
];

function emptyRow() {
  return {
    fullname: '',
    date_of_birth: '',
    gender: '',
    class_id: '',
    wantsOwnAccount: false,
    student_email: '',
    parent_fullname: '',
    parent_email: '',
    parent_phone: '',
    parent_relationship: '',
  };
}

function calculateAge(dateString) {
  if (!dateString) return null;
  const dob = new Date(dateString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function currentClassOf(schoolStudent) {
  return schoolStudent.student.class_students?.[0]?.school_class ?? null;
}

export default function DashboardStudentsPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { schoolUsers } = useSchools();
  const currentRole = schoolUsers.find((su) => su.school.id === schoolId)?.role?.slug;
  const canRegister = ['directeur', 'secretaire'].includes(currentRole);

  const [classFilter, setClassFilter] = useState('');
  const {
    data: students,
    page,
    setPage,
    lastPage,
    search,
    setSearch,
    loading,
    reload,
  } = usePaginatedList(schoolId ? `/schools/${schoolId}/students` : null, { class_id: classFilter || undefined });

  const [classes, setClasses] = useState([]);

  const [open, setOpen] = useState(false);
  const [batch, setBatch] = useState([emptyRow()]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    api.get(`/schools/${schoolId}/classes`, { params: { per_page: 1000 } }).then((r) => setClasses(r.data.data));
  }, [schoolId]);

  function updateRow(index, field, value) {
    setBatch((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setBatch((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index) {
    setBatch((prev) => prev.filter((_, i) => i !== index));
  }

  function closeModal() {
    setOpen(false);
    setBatch([emptyRow()]);
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const payload = {
        students: batch.map((row) => ({
          fullname: row.fullname,
          date_of_birth: row.date_of_birth,
          gender: row.gender,
          class_id: row.class_id,
          student_email: row.wantsOwnAccount ? row.student_email : null,
          parent_fullname: row.parent_fullname || null,
          parent_email: row.parent_email || null,
          parent_phone: row.parent_phone || null,
          parent_relationship: row.parent_relationship,
        })),
      };
      await api.post(`/schools/${schoolId}/students`, payload);
      reload();
      setSuccess(`${payload.students.length} élève(s) inscrit(s) avec succès.`);
      closeModal();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'inscrire ces élèves.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Élèves
          </Typography>
          <Typography color="text.secondary">En dessous de 18 ans, l'élève n'a pas de compte : c'est le parent qui gère.</Typography>
        </Box>
        {canRegister && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Inscrire des élèves
          </Button>
        )}
      </Stack>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, mt: 2 }}>
        <TextField
          placeholder="Rechercher un élève..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          label="Classe"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Toutes les classes</MenuItem>
          {classes.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={2}>
          {students.map((s, i) => {
            const studentClass = currentClassOf(s);
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}>
                <Card variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>{s.student.fullname.charAt(0).toUpperCase()}</Avatar>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="subtitle1" noWrap>
                        {s.student.fullname} {s.student.user ? '' : '(mineur)'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {studentClass ? studentClass.name : 'Aucune classe'} · {s.student.parents.map((p) => p.fullname).join(', ')}
                      </Typography>
                    </Box>
                    <Button component={RouterLink} to={`/dashboard/students/${s.student.id}/bulletin`} size="small">
                      Bulletin
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {students.length === 0 && (
            <Typography color="text.secondary">Aucun élève ne correspond à cette recherche.</Typography>
          )}
        </Stack>
      )}

      {lastPage > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination count={lastPage} page={page} onChange={(_, value) => setPage(value)} color="primary" />
        </Stack>
      )}

      <Dialog open={open} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>Inscrire des élèves</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Stack spacing={2}>
              {batch.map((row, index) => {
                const age = calculateAge(row.date_of_birth);
                const isMajeur = age !== null && age >= 18;

                return (
                  <Card key={index} variant="outlined">
                    <CardContent>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2">
                          Élève #{index + 1} {age !== null && `· ${age} ans`}
                        </Typography>
                        {batch.length > 1 && (
                          <IconButton size="small" onClick={() => removeRow(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>

                      <Stack spacing={2}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                          <TextField
                            label="Nom complet"
                            value={row.fullname}
                            onChange={(e) => updateRow(index, 'fullname', e.target.value)}
                            required
                            fullWidth
                          />
                          <TextField
                            label="Date de naissance"
                            type="date"
                            value={row.date_of_birth}
                            onChange={(e) => updateRow(index, 'date_of_birth', e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            required
                            fullWidth
                          />
                          <TextField
                            select
                            label="Genre"
                            value={row.gender}
                            onChange={(e) => updateRow(index, 'gender', e.target.value)}
                            required
                            fullWidth
                          >
                            <MenuItem value="M">Masculin</MenuItem>
                            <MenuItem value="F">Féminin</MenuItem>
                          </TextField>
                        </Stack>

                        <TextField
                          select
                          label="Classe"
                          value={row.class_id}
                          onChange={(e) => updateRow(index, 'class_id', e.target.value)}
                          required
                          fullWidth
                        >
                          {classes.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                              {c.name}
                            </MenuItem>
                          ))}
                        </TextField>

                        {isMajeur && (
                          <Box>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={row.wantsOwnAccount}
                                  onChange={(e) => updateRow(index, 'wantsOwnAccount', e.target.checked)}
                                />
                              }
                              label="Élève majeur : créer son propre compte"
                            />
                            {row.wantsOwnAccount && (
                              <TextField
                                label="Email de l'élève"
                                type="email"
                                value={row.student_email}
                                onChange={(e) => updateRow(index, 'student_email', e.target.value)}
                                required
                                fullWidth
                              />
                            )}
                          </Box>
                        )}

                        <Typography variant="body2" color="text.secondary">
                          Parent / tuteur (obligatoire)
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                          <TextField
                            label="Nom du parent"
                            value={row.parent_fullname}
                            onChange={(e) => updateRow(index, 'parent_fullname', e.target.value)}
                            fullWidth
                          />
                          <TextField
                            select
                            label="Lien de parenté"
                            value={row.parent_relationship}
                            onChange={(e) => updateRow(index, 'parent_relationship', e.target.value)}
                            required
                            fullWidth
                          >
                            {RELATIONSHIPS.map((r) => (
                              <MenuItem key={r.value} value={r.value}>
                                {r.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                          <TextField
                            label="Email du parent"
                            type="email"
                            value={row.parent_email}
                            onChange={(e) => updateRow(index, 'parent_email', e.target.value)}
                            fullWidth
                          />
                          <TextField
                            label="Téléphone du parent"
                            value={row.parent_phone}
                            onChange={(e) => updateRow(index, 'parent_phone', e.target.value)}
                            fullWidth
                          />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}

              <Button startIcon={<AddIcon />} onClick={addRow} sx={{ alignSelf: 'flex-start' }}>
                Ajouter un élève
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeModal}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Inscription...' : `Inscrire ${batch.length > 1 ? `(${batch.length})` : ''}`}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
