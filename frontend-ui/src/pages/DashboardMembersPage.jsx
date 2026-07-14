import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { motion } from 'motion/react';
import SearchIcon from '@mui/icons-material/Search';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

// Directeur (unique, désigné à la création de l'école), parent/élève
// (rattachés via l'inscription des élèves) et professeur (page dédiée)
// ne sont pas attribuables ici.
const RESTRICTED_ROLE_SLUGS = ['directeur', 'parent', 'eleve', 'professeur'];

export default function DashboardMembersPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data: members, page, setPage, lastPage, search, setSearch, loading, reload } = usePaginatedList(
    schoolId ? `/schools/${schoolId}/members` : null
  );
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ fullname: '', email: '', phone: '', role_id: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/roles').then((r) => setRoles(r.data.filter((role) => !RESTRICTED_ROLE_SLUGS.includes(role.slug))));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/members`, form);
      reload();
      setForm({ fullname: '', email: '', phone: '', role_id: '' });
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'ajouter ce membre.");
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
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Membres
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Ajoutez un membre par email ou téléphone. S'il a déjà un compte, il est simplement rattaché à cette école.
      </Typography>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <TextField
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
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
              {members.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{m.user.fullname.charAt(0).toUpperCase()}</Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" noWrap>
                          {m.user.fullname}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {m.user.email} {m.user.phone ? `· ${m.user.phone}` : ''}
                        </Typography>
                      </Box>
                      <Chip label={m.role?.name} size="small" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {members.length === 0 && <Typography color="text.secondary">Aucun membre trouvé.</Typography>}
            </Stack>
          )}

          {lastPage > 1 && (
            <Stack alignItems="center" sx={{ mt: 3 }}>
              <Pagination count={lastPage} page={page} onChange={(_, value) => setPage(value)} color="primary" />
            </Stack>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ajouter un membre
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Téléphone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Nom complet"
                helperText="Requis uniquement si le membre n'a pas encore de compte"
                value={form.fullname}
                onChange={(e) => setForm((prev) => ({ ...prev, fullname: e.target.value }))}
                fullWidth
              />
              <TextField
                select
                label="Rôle"
                value={form.role_id}
                onChange={(e) => setForm((prev) => ({ ...prev, role_id: e.target.value }))}
                required
                fullWidth
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? 'Ajout...' : 'Ajouter'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
