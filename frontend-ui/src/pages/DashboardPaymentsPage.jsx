import { useEffect, useState } from "react";
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
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import SchoolIcon from "@mui/icons-material/School";
import DescriptionIcon from "@mui/icons-material/Description";
import SettingsIcon from "@mui/icons-material/Settings";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { Navigate } from "react-router-dom";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePaginatedList } from "../hooks/usePaginatedList.js";
import { useApiGet } from "../hooks/useApiGet.js";
import { useSchools } from "../hooks/useSchools.js";

const STATUS_LABELS = {
  0: { label: "En attente", color: "warning" },
  1: { label: "Confirmé", color: "success" },
  2: { label: "Rejeté", color: "error" },
};

const CATEGORY_TUITION = 1;
const CATEGORY_CUSTOM = 3;

// Scolarité est la seule catégorie "système" (liée aux niveaux) proposée
// dans le sélecteur : les autres catégories sont créées par l'école
// elle-même (voir feeCategories, chargées depuis /fee-categories) pour
// coller à ses propres frais — pas de liste figée. La cantine et la
// bibliothèque n'y figurent jamais : ces recettes sont encaissées sur
// place par leur propre personnel, pas via ce formulaire générique.
const TUITION_TILE = { key: "tuition", label: "Frais de scolarité", icon: <SchoolIcon /> };

function emptyMethodForm() {
  return { name: "", number: "", instructions: "", treasury_account_id: "" };
}

function emptyFeeForm() {
  return { category: CATEGORY_TUITION, fee_category_id: "", level_id: "", label: "", amount: "", due_date: "" };
}

function emptyCategoryForm() {
  return { name: "" };
}

// Une "catégorie" affichée peut être la scolarité (category=1, système)
// ou une catégorie créée par l'école (category=3 + fee_category_id) : on
// les identifie toutes les deux par une même clé de sélection dans l'UI.
function categoryKeyOf(fee) {
  return fee.category === CATEGORY_TUITION ? "tuition" : fee.fee_category_id;
}

function emptyCollectForm() {
  return {
    fee_structure_id: "",
    payment_method_id: "",
    amount: "",
    sender_number: "",
    transaction_id: "",
  };
}

export default function DashboardPaymentsPage({ embedded = false } = {}) {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { schoolUsers, loading: roleLoading } = useSchools();
  const currentRole = schoolUsers.find((su) => su.school.id === schoolId)?.role
    ?.slug;
  const canManageConfig = ["directeur", "comptable"].includes(currentRole);

  const [methods, setMethods] = useState([]);
  const { data: treasuryAccountsData } = useApiGet(schoolId ? `/schools/${schoolId}/treasury-accounts` : null);
  const treasuryAccounts = treasuryAccountsData ?? [];
  const { data: feeCategoriesData, reload: reloadFeeCategories } = useApiGet(
    schoolId ? `/schools/${schoolId}/fee-categories` : null,
  );
  const feeCategories = feeCategoriesData ?? [];
  // Tuiles affichées aux comptables : scolarité (système) + toutes les
  // catégories que l'école a créées elle-même.
  const categoryTiles = [
    TUITION_TILE,
    ...feeCategories.map((c) => ({ key: c.id, label: c.name, icon: <DescriptionIcon /> })),
  ];
  const [levels, setLevels] = useState([]);
  const [feeLevel, setFeeLevel] = useState("");
  const [feeCategoryKey, setFeeCategoryKey] = useState("tuition");
  const [feeStructures, setFeeStructures] = useState([]);
  const [configError, setConfigError] = useState(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm());
  const [categoryError, setCategoryError] = useState(null);

  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [methodForm, setMethodForm] = useState(emptyMethodForm());
  const [methodError, setMethodError] = useState(null);

  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [feeForm, setFeeForm] = useState(emptyFeeForm());
  const [feeError, setFeeError] = useState(null);

  const [collectCategory, setCollectCategory] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [collectSummary, setCollectSummary] = useState(null);
  const [collectForm, setCollectForm] = useState(emptyCollectForm());
  const [collectError, setCollectError] = useState(null);
  const [collectSuccess, setCollectSuccess] = useState(null);
  const [collectSubmitting, setCollectSubmitting] = useState(false);

  const [receiptOpen, setReceiptOpen] = useState(null);

  const { data: recentReceiptsData, reload: reloadRecentReceipts } = useApiGet(
    schoolId ? `/schools/${schoolId}/payments` : null,
    { params: { status: 1, per_page: 6 } },
  );
  const recentReceipts = recentReceiptsData?.data ?? [];

  const [statusFilter, setStatusFilter] = useState("");
  const {
    data: payments,
    page,
    setPage,
    lastPage,
    loading: paymentsLoading,
    error: paymentsError,
    reload: reloadPayments,
  } = usePaginatedList(schoolId ? `/schools/${schoolId}/payments` : null, {
    status: statusFilter === "" ? undefined : statusFilter,
  });

  function reloadRecettes() {
    reloadPayments();
    reloadRecentReceipts();
  }

  async function loadMethods() {
    try {
      const response = await api.get(`/schools/${schoolId}/payment-methods`);
      setMethods(response.data);
    } catch (err) {
      setConfigError(
        err.response?.data?.message ||
          "Impossible de charger les moyens de paiement.",
      );
    }
  }

  async function loadFeeStructures(levelId, categoryKey) {
    try {
      const params = categoryKey === "tuition"
        ? { level_id: levelId || undefined, category: CATEGORY_TUITION }
        : { category: CATEGORY_CUSTOM, fee_category_id: categoryKey };
      const response = await api.get(`/schools/${schoolId}/fee-structures`, { params });
      setFeeStructures(response.data);
    } catch (err) {
      setConfigError(
        err.response?.data?.message ||
          "Impossible de charger les tranches.",
      );
    }
  }

  useEffect(() => {
    if (!schoolId) return;
    loadMethods();
    api
      .get("/levels", {
        params: user.current_school?.country_id
          ? { country_id: user.current_school.country_id }
          : {},
      })
      .then((r) => setLevels(r.data))
      .catch((err) =>
        setConfigError(
          err.response?.data?.message || "Impossible de charger les niveaux.",
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    loadFeeStructures(feeLevel, feeCategoryKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, feeLevel, feeCategoryKey]);

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
      setMethodError("Impossible de créer ce moyen de paiement.");
    }
  }

  async function deleteMethod(id) {
    await api.delete(`/schools/${schoolId}/payment-methods/${id}`);
    await loadMethods();
  }

  function closeCategoryModal() {
    setCategoryModalOpen(false);
    setCategoryForm(emptyCategoryForm());
    setCategoryError(null);
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    setCategoryError(null);
    try {
      const response = await api.post(`/schools/${schoolId}/fee-categories`, categoryForm);
      await reloadFeeCategories();
      closeCategoryModal();
      // Bascule directement sur la catégorie qu'on vient de créer, aussi
      // bien dans le panneau de config que dans le sélecteur d'encaissement.
      setFeeCategoryKey(response.data.id);
      setCollectCategory(response.data.id);
    } catch {
      setCategoryError("Impossible de créer cette catégorie.");
    }
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
      await loadFeeStructures(feeLevel, feeCategoryKey);
      closeFeeModal();
    } catch {
      setFeeError("Impossible de créer cette tranche.");
    }
  }

  async function deleteFee(id) {
    await api.delete(`/schools/${schoolId}/fee-structures/${id}`);
    await loadFeeStructures(feeLevel, feeCategoryKey);
  }

  useEffect(() => {
    if (!studentSearch) {
      setStudentResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .get(`/schools/${schoolId}/students`, {
          params: { search: studentSearch, per_page: 5 },
        })
        .then((r) => setStudentResults(r.data.data))
        .catch((err) =>
          setCollectError(
            err.response?.data?.message ||
              "Impossible de rechercher les élèves.",
          ),
        );
    }, 300);
    return () => clearTimeout(timeout);
  }, [studentSearch, schoolId]);

  async function selectStudent(schoolStudent) {
    setSelectedStudent(schoolStudent.student);
    setCollectError(null);
    try {
      const response = await api.get(
        `/schools/${schoolId}/students/${schoolStudent.student.id}/payments`,
      );
      setCollectSummary(response.data);
    } catch (err) {
      setCollectError(
        err.response?.data?.message ||
          "Impossible de charger le suivi de cet élève.",
      );
    }
  }

  function changeStudent() {
    setSelectedStudent(null);
    setCollectSummary(null);
    setCollectForm(emptyCollectForm());
    setCollectError(null);
    setCollectSuccess(null);
  }

  function newPayment() {
    setCollectCategory(null);
    setStudentSearch("");
    setStudentResults([]);
    changeStudent();
  }

  async function handleCollectSubmit(e) {
    e.preventDefault();
    setCollectError(null);
    setCollectSuccess(null);
    setCollectSubmitting(true);
    try {
      await api.post(
        `/schools/${schoolId}/students/${selectedStudent.id}/payments`,
        collectForm,
      );
      reloadRecettes();
      setCollectSuccess("Paiement enregistré.");
      setCollectForm(emptyCollectForm());
      const response = await api.get(
        `/schools/${schoolId}/students/${selectedStudent.id}/payments`,
      );
      setCollectSummary(response.data);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setCollectError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible d'enregistrer ce paiement.",
      );
    } finally {
      setCollectSubmitting(false);
    }
  }

  async function confirmPayment(id) {
    await api.post(`/schools/${schoolId}/payments/${id}/confirm`);
    reloadRecettes();
  }

  async function rejectPayment(id) {
    await api.post(`/schools/${schoolId}/payments/${id}/reject`);
    reloadRecettes();
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (!roleLoading && currentRole === "parent") {
    return <Navigate to="/dashboard/my-children-payments" replace />;
  }

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
        }}
      >
        {embedded ? (
          <Box />
        ) : (
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Paiements
            </Typography>
          </Box>
        )}
        {canManageConfig && (
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setConfigDialogOpen(true)}>
            Configurer
          </Button>
        )}
      </Stack>

      {(configError || paymentsError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {configError || paymentsError}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Encaisser un paiement
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choisissez une catégorie de frais — un reçu est généré automatiquement à la confirmation.
            </Typography>

            {!collectCategory ? (
              <Grid container spacing={1.5}>
                {categoryTiles.map((cat) => (
                  <Grid key={cat.key} size={{ xs: 6, sm: 4 }}>
                    <Card variant="outlined">
                      <Box
                        sx={{
                          p: 2,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 1,
                          textAlign: "center",
                        }}
                        onClick={() => setCollectCategory(cat.key)}
                      >
                        {cat.icon}
                        <Typography variant="body2">{cat.label}</Typography>
                      </Box>
                    </Card>
                  </Grid>
                ))}
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Card variant="outlined">
                    <Box
                      sx={{
                        p: 2,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                        textAlign: "center",
                        color: "text.secondary",
                      }}
                      onClick={() => setCategoryModalOpen(true)}
                    >
                      <AddIcon />
                      <Typography variant="body2">Ajouter une catégorie</Typography>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            ) : !selectedStudent ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {collectError && <Alert severity="error">{collectError}</Alert>}
                <Button size="small" onClick={() => setCollectCategory(null)} sx={{ alignSelf: "flex-start" }}>
                  ← {categoryTiles.find((c) => c.key === collectCategory)?.label}
                </Button>
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
                      <Box sx={{ p: 1.5, cursor: "pointer" }} onClick={() => selectStudent(s)}>
                        <Typography variant="subtitle2">{s.student?.fullname}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {s.student.class_students?.[0]?.school_class?.name ?? "Aucune classe"}
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
              <Box>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1">{selectedStudent.fullname}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {categoryTiles.find((c) => c.key === collectCategory)?.label}
                    </Typography>
                  </Box>
                  <Button size="small" onClick={changeStudent}>
                    Changer d'élève
                  </Button>
                </Stack>

                {collectError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {collectError}
                  </Alert>
                )}

                {collectSummary && (
                  <>
                    <Alert severity={collectSummary.balance > 0 ? "warning" : "success"} sx={{ mb: 2 }}>
                      Solde restant : {Number(collectSummary.balance).toLocaleString()} FCFA
                    </Alert>
                    {collectSuccess && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        {collectSuccess}
                      </Alert>
                    )}
                    <Box
                      component="form"
                      onSubmit={handleCollectSubmit}
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      <TextField
                        select
                        label="Tranche concernée"
                        value={collectForm.fee_structure_id}
                        onChange={(e) =>
                          setCollectForm((prev) => ({ ...prev, fee_structure_id: e.target.value }))
                        }
                        required
                        fullWidth
                        helperText={
                          collectSummary.fee_structures.filter((fee) => categoryKeyOf(fee) === collectCategory)
                            .length === 0
                            ? "Aucune tranche configurée pour cette catégorie — ajoutez-en une dans Configurer."
                            : undefined
                        }
                      >
                        {collectSummary.fee_structures
                          .filter((fee) => categoryKeyOf(fee) === collectCategory)
                          .map((fee) => (
                            <MenuItem key={fee.id} value={fee.id}>
                              {fee.label} — {Number(fee.amount).toLocaleString()} FCFA
                            </MenuItem>
                          ))}
                      </TextField>
                      <TextField
                        select
                        label="Mode de paiement"
                        value={collectForm.payment_method_id}
                        onChange={(e) =>
                          setCollectForm((prev) => ({ ...prev, payment_method_id: e.target.value }))
                        }
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
                        onChange={(e) =>
                          setCollectForm((prev) => ({ ...prev, sender_number: e.target.value }))
                        }
                        required
                        fullWidth
                      />
                      <TextField
                        label="ID de transaction (optionnel)"
                        value={collectForm.transaction_id}
                        onChange={(e) =>
                          setCollectForm((prev) => ({ ...prev, transaction_id: e.target.value }))
                        }
                        fullWidth
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={collectSubmitting}
                        startIcon={<ReceiptLongIcon />}
                      >
                        {collectSubmitting
                          ? "Enregistrement..."
                          : ["directeur", "comptable"].includes(currentRole)
                            ? "Encaisser et générer le reçu"
                            : "Enregistrer (en attente de confirmation)"}
                      </Button>
                    </Box>
                  </>
                )}
              </Box>
            )}

            {collectCategory && (
              <Button size="small" onClick={newPayment} sx={{ mt: 2 }}>
                Nouveau paiement
              </Button>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Reçus récents
            </Typography>
            <Stack divider={<Divider />}>
              {recentReceipts.map((p) => (
                <Box
                  key={p.id}
                  sx={{ py: 1.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 1.5 }}
                  onClick={() => setReceiptOpen(p)}
                >
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {p.student?.fullname} — {p.fee_structure?.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.receipt_number ?? "—"} · {p.confirmed_at ? new Date(p.confirmed_at).toLocaleDateString("fr-FR") : ""}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="success.main" sx={{ whiteSpace: "nowrap" }}>
                    +{Number(p.amount).toLocaleString()} FCFA
                  </Typography>
                </Box>
              ))}
              {recentReceipts.length === 0 && (
                <Typography color="text.secondary" sx={{ py: 1.5 }}>
                  Aucun reçu pour l'instant.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 4 }} gutterBottom>
        Journal des recettes
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
              <CardContent
                sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", cursor: p.status === 1 ? "pointer" : "default" }}
                onClick={() => p.status === 1 && setReceiptOpen(p)}
              >
                <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2">
                    {p.receipt_number ? `${p.receipt_number} · ` : ""}
                    {p.student?.fullname}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.fee_structure?.label} · {Number(p.amount).toLocaleString()} FCFA ·{" "}
                    {p.payment_method?.name} ({p.sender_number})
                    {p.transaction_id ? ` · Réf. ${p.transaction_id}` : ""}
                  </Typography>
                </Box>
                <Chip label={STATUS_LABELS[p.status]?.label} color={STATUS_LABELS[p.status]?.color} size="small" />
                {p.status === 0 && (
                  <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
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
          {payments.length === 0 && (
            <Typography color="text.secondary">Aucun paiement pour l'instant.</Typography>
          )}
        </Stack>
      )}

      {lastPage > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination count={lastPage} page={page} onChange={(_, value) => setPage(value)} color="primary" />
        </Stack>
      )}

      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Configuration des recettes</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">Moyens de paiement</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setMethodModalOpen(true)}>
                  Ajouter
                </Button>
              </Stack>
              <Stack spacing={1.5}>
                {methods.map((m) => (
                  <Card key={m.id} variant="outlined">
                    <CardContent
                      sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2">{m.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {m.number}
                          {m.treasury_account?.name ? ` · ${m.treasury_account.name}` : ""}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => deleteMethod(m.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </CardContent>
                  </Card>
                ))}
                {methods.length === 0 && (
                  <Typography color="text.secondary">Aucun moyen de paiement configuré.</Typography>
                )}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">Tranches de frais</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setFeeForm({
                      ...emptyFeeForm(),
                      category: feeCategoryKey === "tuition" ? CATEGORY_TUITION : CATEGORY_CUSTOM,
                      fee_category_id: feeCategoryKey === "tuition" ? "" : feeCategoryKey,
                    });
                    setFeeModalOpen(true);
                  }}
                >
                  Ajouter
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                  select
                  label="Catégorie"
                  value={feeCategoryKey}
                  onChange={(e) => setFeeCategoryKey(e.target.value)}
                  size="small"
                  fullWidth
                >
                  {categoryTiles.map((cat) => (
                    <MenuItem key={cat.key} value={cat.key}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </TextField>
                <IconButton size="small" onClick={() => setCategoryModalOpen(true)} title="Ajouter une catégorie">
                  <AddIcon fontSize="small" />
                </IconButton>
              </Stack>
              {feeCategoryKey === "tuition" && (
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
              )}
              <Stack spacing={1.5}>
                {feeStructures.map((f) => (
                  <Card key={f.id} variant="outlined">
                    <CardContent
                      sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2">
                          {f.level?.name ?? "Tous niveaux"} · {f.label}
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
                {feeStructures.length === 0 && (
                  <Typography color="text.secondary">Aucune tranche configurée.</Typography>
                )}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfigDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={categoryModalOpen} onClose={closeCategoryModal} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter une catégorie de frais</DialogTitle>
        <Box component="form" onSubmit={handleCreateCategory}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {categoryError && <Alert severity="error">{categoryError}</Alert>}
            <TextField
              label="Nom"
              placeholder="Frais d'inscription, Transport, Uniformes..."
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeCategoryModal}>Annuler</Button>
            <Button type="submit" variant="contained">
              Ajouter
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={methodModalOpen} onClose={closeMethodModal} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter un moyen de paiement</DialogTitle>
        <Box component="form" onSubmit={handleCreateMethod}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
            <TextField
              select
              label="Compte de trésorerie (optionnel)"
              value={methodForm.treasury_account_id}
              onChange={(e) => setMethodForm((prev) => ({ ...prev, treasury_account_id: e.target.value }))}
              helperText="Les paiements reçus par ce moyen créditeront ce compte."
              fullWidth
            >
              <MenuItem value="">Non précisé</MenuItem>
              {treasuryAccounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </TextField>
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
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {feeError && <Alert severity="error">{feeError}</Alert>}
            <TextField
              select
              label="Catégorie"
              value={categoryKeyOf(feeForm)}
              onChange={(e) => {
                const key = e.target.value;
                setFeeForm((prev) => ({
                  ...prev,
                  category: key === "tuition" ? CATEGORY_TUITION : CATEGORY_CUSTOM,
                  fee_category_id: key === "tuition" ? "" : key,
                }));
              }}
              required
              fullWidth
            >
              {categoryTiles.map((cat) => (
                <MenuItem key={cat.key} value={cat.key}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>
            {feeForm.category === CATEGORY_TUITION && (
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
            )}
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

      <Dialog open={Boolean(receiptOpen)} onClose={() => setReceiptOpen(null)} fullWidth maxWidth="xs">
        {receiptOpen && (
          <Box className="receipt-print-area">
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Reçu
              <IconButton size="small" onClick={() => setReceiptOpen(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography variant="caption" color="text.secondary">
                {receiptOpen.receipt_number ?? "—"} · {receiptOpen.confirmed_at ? new Date(receiptOpen.confirmed_at).toLocaleDateString("fr-FR") : ""}
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ textAlign: "center", py: 2 }}>
                {Number(receiptOpen.amount).toLocaleString()} FCFA
              </Typography>
              <Stack spacing={1} divider={<Divider />}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Élève</Typography>
                  <Typography fontWeight={600}>{receiptOpen.student?.fullname}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Catégorie</Typography>
                  <Typography fontWeight={600}>{receiptOpen.fee_structure?.label}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Mode de paiement</Typography>
                  <Typography fontWeight={600}>{receiptOpen.payment_method?.name}</Typography>
                </Stack>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setReceiptOpen(null)}>Fermer</Button>
              <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
                Imprimer
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-print-area, .receipt-print-area * { visibility: visible; }
          .receipt-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </Box>
  );
}
