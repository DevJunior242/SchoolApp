import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import SearchIcon from '@mui/icons-material/Search';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

export default function DashboardClassesPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const countryId = user.current_school?.country_id;

  const { data: classes, page, setPage, lastPage, search, setSearch, loading, reload } = usePaginatedList(
    schoolId ? `/schools/${schoolId}/classes` : null
  );

  const [levels, setLevels] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({ name: '', level_id: '' });
  const [classError, setClassError] = useState(null);
  const [classSubmitting, setClassSubmitting] = useState(false);

  const [assignClass, setAssignClass] = useState(null);
  const [assignForm, setAssignForm] = useState({ subject_id: '', user_id: '' });
  const [assignError, setAssignError] = useState(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    api.get('/levels', { params: countryId ? { country_id: countryId } : {} }).then((r) => setLevels(r.data));
    api.get(`/schools/${schoolId}/teachers`, { params: { per_page: 100 } }).then((r) => setTeachers(r.data.data));
    api.get('/subjects').then((r) => setSubjects(r.data));
  }, [schoolId, countryId]);

  function closeClassModal() {
    setClassModalOpen(false);
    setClassForm({ name: '', level_id: '' });
    setClassError(null);
  }

  async function handleCreateClass(e) {
    e.preventDefault();
    setClassError(null);
    setClassSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/classes`, classForm);
      reload();
      closeClassModal();
    } catch {
      setClassError('Impossible de créer la classe.');
    } finally {
      setClassSubmitting(false);
    }
  }

  function closeAssignModal() {
    setAssignClass(null);
    setAssignForm({ subject_id: '', user_id: '' });
    setAssignError(null);
  }

  async function handleAssign(e) {
    e.preventDefault();
    setAssignError(null);
    setAssignSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/classes/${assignClass.id}/teachers`, assignForm);
      reload();
      closeAssignModal();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setAssignError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'assigner ce professeur.");
    } finally {
      setAssignSubmitting(false);
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
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Classes
          </Typography>
          <Typography color="text.secondary">Un professeur peut enseigner plusieurs matières dans une même classe.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setClassModalOpen(true)}>
          Ajouter une classe
        </Button>
      </Stack>

      <TextField
        placeholder="Rechercher une classe..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
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

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={2}>
          {classes.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle1">{c.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {c.level?.name}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" component={RouterLink} to={`/dashboard/classes/${c.id}/timetable`}>
                        Emploi du temps
                      </Button>
                      <Button size="small" onClick={() => setAssignClass(c)}>
                        Assigner un professeur
                      </Button>
                    </Stack>
                  </Stack>

                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {c.class_subject_teachers.map((assignment) => (
                      <Chip
                        key={assignment.id}
                        label={`${assignment.subject.name} · ${assignment.teacher.fullname}`}
                        size="small"
                      />
                    ))}
                    {c.class_subject_teachers.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Aucun professeur assigné.
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {classes.length === 0 && <Typography color="text.secondary">Aucune classe trouvée.</Typography>}
        </Stack>
      )}

      {lastPage > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination count={lastPage} page={page} onChange={(_, value) => setPage(value)} color="primary" />
        </Stack>
      )}

      <Dialog open={classModalOpen} onClose={closeClassModal} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter une classe</DialogTitle>
        <Box component="form" onSubmit={handleCreateClass}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {classError && <Alert severity="error">{classError}</Alert>}
            <TextField
              label="Nom de la classe"
              value={classForm.name}
              onChange={(e) => setClassForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Niveau"
              value={classForm.level_id}
              onChange={(e) => setClassForm((prev) => ({ ...prev, level_id: e.target.value }))}
              required
              fullWidth
            >
              {levels.map((level) => (
                <MenuItem key={level.id} value={level.id}>
                  {level.name}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeClassModal}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={classSubmitting}>
              {classSubmitting ? 'Création...' : 'Créer'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(assignClass)} onClose={closeAssignModal} fullWidth maxWidth="xs">
        <DialogTitle>Assigner un professeur — {assignClass?.name}</DialogTitle>
        <Box component="form" onSubmit={handleAssign}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {assignError && <Alert severity="error">{assignError}</Alert>}
            <TextField
              select
              label="Matière"
              value={assignForm.subject_id}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, subject_id: e.target.value }))}
              required
              fullWidth
            >
              {subjects.map((subject) => (
                <MenuItem key={subject.id} value={subject.id}>
                  {subject.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Professeur"
              value={assignForm.user_id}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, user_id: e.target.value }))}
              required
              fullWidth
              helperText={teachers.length === 0 ? "Ajoutez d'abord un professeur depuis la page Professeurs." : ''}
            >
              {teachers.map((t) => (
                <MenuItem key={t.id} value={t.user_id}>
                  {t.user.fullname}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeAssignModal}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={assignSubmitting || teachers.length === 0}>
              {assignSubmitting ? 'Ajout...' : 'Assigner'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
