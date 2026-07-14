import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { motion } from 'motion/react';
import SearchIcon from '@mui/icons-material/Search';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

function calculateAge(dateString) {
  const dob = new Date(dateString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function DashboardParentsPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data: parents, page, setPage, lastPage, search, setSearch, loading, error: listError } = usePaginatedList(
    schoolId ? `/schools/${schoolId}/parents` : null
  );

  const [selectedParent, setSelectedParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childrenError, setChildrenError] = useState(null);

  async function openParent(parent) {
    setSelectedParent(parent);
    setChildrenLoading(true);
    setChildrenError(null);
    try {
      const response = await api.get(`/schools/${schoolId}/parents/${parent.user.id}/children`);
      setChildren(response.data);
    } catch (err) {
      setChildrenError(err.response?.data?.message || 'Impossible de charger les enfants de ce parent.');
    } finally {
      setChildrenLoading(false);
    }
  }

  function closeModal() {
    setSelectedParent(null);
    setChildren([]);
    setChildrenError(null);
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
        Parents
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Cliquez sur un parent pour voir ses enfants inscrits dans cette école.
      </Typography>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {listError}
        </Alert>
      )}

      <TextField
        placeholder="Rechercher un parent..."
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
          {parents.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}>
              <Card variant="outlined">
                <CardActionArea onClick={() => openParent(p)} sx={{ p: 1 }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>{p.user.fullname.charAt(0).toUpperCase()}</Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" noWrap>
                        {p.user.fullname}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {p.user.email} {p.user.phone ? `· ${p.user.phone}` : ''}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </motion.div>
          ))}
          {parents.length === 0 && <Typography color="text.secondary">Aucun parent trouvé.</Typography>}
        </Stack>
      )}

      {lastPage > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination count={lastPage} page={page} onChange={(_, value) => setPage(value)} color="primary" />
        </Stack>
      )}

      <Dialog open={Boolean(selectedParent)} onClose={closeModal} fullWidth maxWidth="sm">
        <DialogTitle>Enfants de {selectedParent?.user.fullname}</DialogTitle>
        <DialogContent>
          {childrenError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {childrenError}
            </Alert>
          )}
          {childrenLoading ? (
            <Typography color="text.secondary">Chargement...</Typography>
          ) : (
            <Stack spacing={1.5} sx={{ pb: 1 }}>
              {children.map((child) => {
                const studentClass = child.class_students?.[0]?.school_class;
                const schoolStudent = child.school_students?.[0];
                return (
                  <Card key={child.id} variant="outlined">
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{child.fullname.charAt(0).toUpperCase()}</Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" noWrap>
                          {child.fullname}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {calculateAge(child.date_of_birth)} ans · {child.gender === 'M' ? 'Masculin' : 'Féminin'}
                          {schoolStudent?.matricule ? ` · Matricule ${schoolStudent.matricule}` : ''}
                        </Typography>
                      </Box>
                      <Chip label={studentClass ? studentClass.name : 'Aucune classe'} size="small" />
                    </CardContent>
                  </Card>
                );
              })}
              {children.length === 0 && <Typography color="text.secondary">Aucun enfant inscrit dans cette école.</Typography>}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
