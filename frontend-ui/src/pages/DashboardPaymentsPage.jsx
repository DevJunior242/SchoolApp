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
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { Navigate } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';
import { useSchools } from '../hooks/useSchools.js';

const STATUS_LABELS = {
  0: { label: 'En attente', color: 'warning' },
  1: { label: 'Confirmé', color: 'success' },
  2: { label: 'Rejeté', color: 'error' },
};

function emptyMethodForm() {
  return { name: '', number: '', instructions: '' };
}

function emptyFeeForm() {
  return { level_id: '', label: '', amount: '', due_date: '' };
}

function emptyCollectForm() {
  return { fee_structure_id: '', payment_method_id: '', amount: '', sender_number: '', transaction_id: '' };
}

export default function DashboardPaymentsPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { schoolUsers, loading: roleLoading } = useSchools();
  const currentRole = schoolUsers.find((su) => su.school.id === schoolId)?.role?.slug;
  const canManageConfig = ['directeur', 'comptable'].includes(currentRole);

  const [methods, setMethods] = useState([]);
  const [levels, setLevels] = useState([]);
  const [feeLevel, setFeeLevel] = useState('');
  const [feeStructures, setFeeStructures] = useState([]);

  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [methodForm, setMethodForm] = useState(emptyMethodForm());
  const [methodError, setMethodError] = useState(null);

  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [feeForm, setFeeForm] = useState(emptyFeeForm());
  const [feeError, setFeeError] = useState(null);

  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [collectSummary, setCollectSummary] = useState(null);
  const [collectForm, setCollectForm] = useState(emptyCollectForm());
  const [collectError, setCollectError] = useState(null);
  const [collectSuccess, setCollectSuccess] = useState(null);
  const [collectSubmitting, setCollectSubmitting] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const {
    data: payments,
    page,
    setPage,
    lastPage,
    loading: paymentsLoading,
    reload: reloadPayments,
  } = usePaginatedList(schoolId ? `/schools/${schoolId}/payments` : null, {
    status: statusFilter === '' ? undefined : statusFilter,
  });

  async function loadMethods() {
    const response = await api.get(`/schools/${schoolId}/payment-methods`);
    setMethods(response.data);
  }

  async function loadFeeStructures(levelId) {
    const response = await api.get(`/schools/${schoolId}/fee-structures`, { params: { level_id: levelId || undefined } });
    setFeeStructures(response.data);
  }

  useEffect(() => {
    if (!schoolId) return;
    loadMethods();
    api.get('/levels', { params: user.current_school?.country_id ? { country_id: user.current_school.country_id } : {} }).then((r) => setLevels(r.data));
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    loadFeeStructures(feeLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, feeLevel]);

  function closeMethodModal() {
    setMethodModalOpen(false);
    setMethodForm(emptyMethodForm());
    setMethodError(null);
  }

  async function handleCreateMethod(e) {
    e.preventDefault();
    setMethodError(null);
    try {
      await api.post(`/schools/${schoolId}/payment-methods`, methodForm);
      await loadMethods();
      closeMethodModal();
    } catch {
      setMethodError('Impossible de créer ce moyen de paiement.');
    }
  }

  async function deleteMethod(id) {
    await api.delete(`/schools/${schoolId}/payment-methods/${id}`);
    await loadMethods();
  }

  function closeFeeModal() {
    setFeeModalOpen(false);
    setFeeForm(emptyFeeForm());
    setFeeError(null);
  }

  async function handleCreateFee(e) {
    e.preventDefault();
    setFeeError(null);
    try {
      await api.post(`/schools/${schoolId}/fee-structures`, feeForm);
      await loadFeeStructures(feeLevel);
      closeFeeModal();
    } catch {
      setFeeError('Impossible de créer cette tranche.');
    }
  }

  async function deleteFee(id) {
    await api.delete(`/schools/${schoolId}/fee-structures/${id}`);
    await loadFeeStructures(feeLevel);
  }

  useEffect(() => {
    if (!collectModalOpen || !studentSearch) {
      setStudentResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      api.get(`/schools/${schoolId}/students`, { params: { search: studentSearch, per_page: 5 } }).then((r) => setStudentResults(r.data.data));
    }, 300);
    return () => clearTimeout(timeout);
  }, [collectModalOpen, studentSearch, schoolId]);

  async function selectStudent(schoolStudent) {
    setSelectedStudent(schoolStudent.student);
    const response = await api.get(`/schools/${schoolId}/students/${schoolStudent.student.id}/payments`);
    setCollectSummary(response.data);
  }

  function closeCollectModal() {
    setCollectModalOpen(false);
    setStudentSearch('');
    setStudentResults([]);
    setSelectedStudent(null);
    setCollectSummary(null);
    setCollectForm(emptyCollectForm());
    setCollectError(null);
    setCollectSuccess(null);
  }

  async function handleCollectSubmit(e) {
    e.preventDefault();
    setCollectError(null);
    setCollectSuccess(null);
    setCollectSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/students/${selectedStudent.id}/payments`, collectForm);
      reloadPayments();
      setCollectSuccess('Paiement enregistré.');
      setCollectForm(emptyCollectForm());
      const response = await api.get(`/schools/${schoolId}/students/${selectedStudent.id}/payments`);
      setCollectSummary(response.data);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setCollectError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'enregistrer ce paiement.");
    } finally {
      setCollectSubmitting(false);
    }
  }

  async function confirmPayment(id) {
    await api.post(`/schools/${schoolId}/payments/${id}/confirm`);
    reloadPayments();
  }

  async function rejectPayment(id) {
    await api.post(`/schools/${schoolId}/payments/${id}/reject`);
    reloadPayments();
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (!roleLoading && currentRole === 'parent') {
    return <Navigate to="/dashboard/my-children-payments" replace />;
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Paiements
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {canManageConfig
              ? 'Configurez les moyens de paiement et les tranches de scolarité, puis confirmez les paiements déclarés par les parents.'
              : 'Encaissez les paiements reçus et suivez les déclarations des parents.'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCollectModalOpen(true)}>
          Encaisser un paiement
        </Button>
      </Stack>

      {canManageConfig && (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Moyens de paiement</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setMethodModalOpen(true)}>
                Ajouter
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {methods.map((m) => (
                <Card key={m.id} variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2">{m.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {m.number}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => deleteMethod(m.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardContent>
                </Card>
              ))}
              {methods.length === 0 && <Typography color="text.secondary">Aucun moyen de paiement configuré.</Typography>}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Tranches de scolarité</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setFeeModalOpen(true)}>
                Ajouter
              </Button>
            </Stack>
            <TextField
              select
              label="Filtrer par niveau"
              value={feeLevel}
              onChange={(e) => setFeeLevel(e.target.value)}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
            >
              <MenuItem value="">Tous les niveaux</MenuItem>
              {levels.map((level) => (
                <MenuItem key={level.id} value={level.id}>
                  {level.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack spacing={1.5}>
              {feeStructures.map((f) => (
                <Card key={f.id} variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2">
                        {f.level.name} · {f.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Number(f.amount).toLocaleString()} FCFA
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => deleteFee(f.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardContent>
                </Card>
              ))}
              {feeStructures.length === 0 && <Typography color="text.secondary">Aucune tranche configurée.</Typography>}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
      )}

      <Typography variant="h6" gutterBottom>
        Paiements déclarés
      </Typography>
      <TextField
        select
        label="Statut"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        size="small"
        sx={{ mb: 2, minWidth: 220 }}
      >
        <MenuItem value="">Tous</MenuItem>
        <MenuItem value="0">En attente</MenuItem>
        <MenuItem value="1">Confirmé</MenuItem>
        <MenuItem value="2">Rejeté</MenuItem>
      </TextField>

      {paymentsLoading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5}>
          {payments.map((p) => (
            <Card key={p.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2">{p.student.fullname}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.fee_structure.label} · {Number(p.amount).toLocaleString()} FCFA · {p.payment_method.name} ({p.sender_number})
                    {p.transaction_id ? ` · Réf. ${p.transaction_id}` : ''}
                  </Typography>
                </Box>
                <Chip label={STATUS_LABELS[p.status].label} color={STATUS_LABELS[p.status].color} size="small" />
                {p.status === 0 && (
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" color="success" onClick={() => confirmPayment(p.id)}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => rejectPayment(p.id)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
              </CardContent>
            </Card>
          ))}
          {payments.length === 0 && <Typography color="text.secondary">Aucun paiement pour l'instant.</Typography>}
        </Stack>
      )}

      {lastPage > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination count={lastPage} page={page} onChange={(_, value) => setPage(value)} color="primary" />
        </Stack>
      )}

      <Dialog open={methodModalOpen} onClose={closeMethodModal} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter un moyen de paiement</DialogTitle>
        <Box component="form" onSubmit={handleCreateMethod}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {methodError && <Alert severity="error">{methodError}</Alert>}
            <TextField
              label="Nom"
              placeholder="Orange Money, Wave, Espèces..."
              value={methodForm.name}
              onChange={(e) => setMethodForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Numéro"
              value={methodForm.number}
              onChange={(e) => setMethodForm((prev) => ({ ...prev, number: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Instructions (optionnel)"
              value={methodForm.instructions}
              onChange={(e) => setMethodForm((prev) => ({ ...prev, instructions: e.target.value }))}
              multiline
              rows={2}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeMethodModal}>Annuler</Button>
            <Button type="submit" variant="contained">
              Ajouter
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={feeModalOpen} onClose={closeFeeModal} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter une tranche</DialogTitle>
        <Box component="form" onSubmit={handleCreateFee}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {feeError && <Alert severity="error">{feeError}</Alert>}
            <TextField
              select
              label="Niveau"
              value={feeForm.level_id}
              onChange={(e) => setFeeForm((prev) => ({ ...prev, level_id: e.target.value }))}
              required
              fullWidth
            >
              {levels.map((level) => (
                <MenuItem key={level.id} value={level.id}>
                  {level.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Libellé"
              placeholder="Tranche 1"
              value={feeForm.label}
              onChange={(e) => setFeeForm((prev) => ({ ...prev, label: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Montant (FCFA)"
              type="number"
              value={feeForm.amount}
              onChange={(e) => setFeeForm((prev) => ({ ...prev, amount: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Échéance (optionnel)"
              type="date"
              value={feeForm.due_date}
              onChange={(e) => setFeeForm((prev) => ({ ...prev, due_date: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeFeeModal}>Annuler</Button>
            <Button type="submit" variant="contained">
              Ajouter
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={collectModalOpen} onClose={closeCollectModal} fullWidth maxWidth="sm">
        <DialogTitle>Encaisser un paiement</DialogTitle>
        <DialogContent>
          {!selectedStudent ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Rechercher un élève"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                fullWidth
                autoFocus
              />
              <Stack spacing={1}>
                {studentResults.map((s) => (
                  <Card key={s.id} variant="outlined">
                    <Box sx={{ p: 1.5, cursor: 'pointer' }} onClick={() => selectStudent(s)}>
                      <Typography variant="subtitle2">{s.student.fullname}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {s.student.class_students?.[0]?.school_class?.name ?? 'Aucune classe'}
                      </Typography>
                    </Box>
                  </Card>
                ))}
                {studentSearch && studentResults.length === 0 && (
                  <Typography color="text.secondary">Aucun élève trouvé.</Typography>
                )}
              </Stack>
            </Box>
          ) : (
            <Box sx={{ pt: 1 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">{selectedStudent.fullname}</Typography>
                <Button size="small" onClick={() => { setSelectedStudent(null); setCollectSummary(null); }}>
                  Changer d'élève
                </Button>
              </Stack>

              {collectSummary && (
                <>
                  <Alert severity={collectSummary.balance > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
                    Solde restant : {Number(collectSummary.balance).toLocaleString()} FCFA
                  </Alert>
                  {collectError && <Alert severity="error" sx={{ mb: 2 }}>{collectError}</Alert>}
                  {collectSuccess && <Alert severity="success" sx={{ mb: 2 }}>{collectSuccess}</Alert>}
                  <Box component="form" onSubmit={handleCollectSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      select
                      label="Tranche concernée"
                      value={collectForm.fee_structure_id}
                      onChange={(e) => setCollectForm((prev) => ({ ...prev, fee_structure_id: e.target.value }))}
                      required
                      fullWidth
                    >
                      {collectSummary.fee_structures.map((fee) => (
                        <MenuItem key={fee.id} value={fee.id}>
                          {fee.label} — {Number(fee.amount).toLocaleString()} FCFA
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Moyen de paiement"
                      value={collectForm.payment_method_id}
                      onChange={(e) => setCollectForm((prev) => ({ ...prev, payment_method_id: e.target.value }))}
                      required
                      fullWidth
                    >
                      {methods.map((m) => (
                        <MenuItem key={m.id} value={m.id}>
                          {m.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Montant reçu (FCFA)"
                      type="number"
                      value={collectForm.amount}
                      onChange={(e) => setCollectForm((prev) => ({ ...prev, amount: e.target.value }))}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Numéro (payeur, ou 'Espèces')"
                      value={collectForm.sender_number}
                      onChange={(e) => setCollectForm((prev) => ({ ...prev, sender_number: e.target.value }))}
                      required
                      fullWidth
                    />
                    <TextField
                      label="ID de transaction (optionnel)"
                      value={collectForm.transaction_id}
                      onChange={(e) => setCollectForm((prev) => ({ ...prev, transaction_id: e.target.value }))}
                      fullWidth
                    />
                    <Button type="submit" variant="contained" disabled={collectSubmitting}>
                      {collectSubmitting
                        ? 'Enregistrement...'
                        : ['directeur', 'comptable'].includes(currentRole)
                          ? 'Encaisser (confirmé immédiatement)'
                          : 'Enregistrer (en attente de confirmation)'}
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeCollectModal}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
