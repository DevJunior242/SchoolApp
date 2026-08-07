import { useState } from "react";
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
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SettingsIcon from "@mui/icons-material/Settings";
import DescriptionIcon from "@mui/icons-material/Description";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePaginatedList } from "../hooks/usePaginatedList.js";
import { useApiGet } from "../hooks/useApiGet.js";
import { useSchools } from "../hooks/useSchools.js";

const STATUS_LABELS = {
  0: { label: "En attente", color: "warning" },
  1: { label: "Confirmée", color: "success" },
  2: { label: "Rejetée", color: "error" },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyCategoryForm() {
  return { name: "" };
}

function emptyExpenseForm() {
  return {
    expense_category_id: "",
    treasury_account_id: "",
    payment_method_id: "",
    amount: "",
    supplier_name: "",
    description: "",
    expense_date: todayISO(),
  };
}

export default function DashboardExpensesPage({ embedded = false } = {}) {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const { schoolUsers } = useSchools();
  const currentRole = schoolUsers.find((su) => su?.school?.id === schoolId)?.role?.slug;
  const canManage = ["directeur", "comptable"].includes(currentRole ?? "");

  const { data: categoriesData, reload: reloadCategories } = useApiGet(
    schoolId ? `/schools/${schoolId}/expense-categories` : null,
  );
  const categories = categoriesData ?? [];

  const { data: accountsData } = useApiGet(schoolId ? `/schools/${schoolId}/treasury-accounts` : null);
  const accounts = accountsData ?? [];

  const { data: methodsData } = useApiGet(schoolId ? `/schools/${schoolId}/payment-methods` : null);
  const methods = methodsData ?? [];

  const { data: recentData, reload: reloadRecent } = useApiGet(
    schoolId ? `/schools/${schoolId}/expenses` : null,
    { params: { status: 1, per_page: 6 } },
  );
  const recentExpenses = recentData?.data ?? [];

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm());
  const [categoryError, setCategoryError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm());
  const [receiptFile, setReceiptFile] = useState(null);
  const [expenseError, setExpenseError] = useState(null);
  const [expenseSuccess, setExpenseSuccess] = useState(null);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const {
    data: expenses,
    page,
    setPage,
    lastPage,
    loading: expensesLoading,
    error: expensesError,
    reload: reloadExpenses,
  } = usePaginatedList(schoolId ? `/schools/${schoolId}/expenses` : null, {
    status: statusFilter === "" ? undefined : statusFilter,
  });

  function reloadDepenses() {
    reloadExpenses();
    reloadRecent();
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
      const response = await api.post(`/schools/${schoolId}/expense-categories`, categoryForm);
      await reloadCategories();
      closeCategoryModal();
      setSelectedCategory(response.data.id);
    } catch {
      setCategoryError("Impossible de créer cette catégorie.");
    }
  }

  async function deleteCategory(id) {
    await api.delete(`/schools/${schoolId}/expense-categories/${id}`);
    reloadCategories();
  }

  function resetExpenseForm() {
    setExpenseForm((prev) => ({ ...emptyExpenseForm(), expense_category_id: prev.expense_category_id }));
    setReceiptFile(null);
    setExpenseError(null);
  }

  async function handleCreateExpense(e) {
    e.preventDefault();
    setExpenseError(null);
    setExpenseSuccess(null);
    setExpenseSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries({ ...expenseForm, expense_category_id: selectedCategory }).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      if (receiptFile) formData.append("receipt", receiptFile);

      await api.post(`/schools/${schoolId}/expenses`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      reloadDepenses();
      setExpenseSuccess("Dépense enregistrée.");
      resetExpenseForm();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setExpenseError(
        messages ? Object.values(messages).flat().join(" ") : "Impossible d'enregistrer cette dépense.",
      );
    } finally {
      setExpenseSubmitting(false);
    }
  }

  async function confirmExpense(id) {
    await api.post(`/schools/${schoolId}/expenses/${id}/confirm`);
    reloadDepenses();
  }

  async function rejectExpense(id) {
    await api.post(`/schools/${schoolId}/expenses/${id}/reject`);
    reloadDepenses();
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2, mb: 2 }}
      >
        {embedded ? (
          <Box />
        ) : (
          <Typography variant="h5" fontWeight={700}>
            Dépenses
          </Typography>
        )}
        {canManage && (
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setConfigDialogOpen(true)}>
            Configurer
          </Button>
        )}
      </Stack>

      {expensesError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {expensesError}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Enregistrer une dépense
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Chaque dépense conserve la date, le montant, le fournisseur, le mode de paiement et la pièce justificative.
            </Typography>

            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              {categories.map((c) => (
                <Grid key={c.id} size={{ xs: 6, sm: 4 }}>
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
                        borderColor: selectedCategory === c.id ? "primary.main" : undefined,
                        color: selectedCategory === c.id ? "primary.main" : undefined,
                      }}
                      onClick={() => setSelectedCategory(c.id)}
                    >
                      <DescriptionIcon />
                      <Typography variant="body2">{c.name}</Typography>
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

            {expenseError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {expenseError}
              </Alert>
            )}
            {expenseSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {expenseSuccess}
              </Alert>
            )}

            <Box component="form" onSubmit={handleCreateExpense} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Date"
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, expense_date: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
              />
              <TextField
                label="Montant (FCFA)"
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Fournisseur"
                value={expenseForm.supplier_name}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, supplier_name: e.target.value }))}
                fullWidth
              />
              <TextField
                select
                label="Mode de paiement (optionnel)"
                value={expenseForm.payment_method_id}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, payment_method_id: e.target.value }))}
                fullWidth
              >
                <MenuItem value="">Non précisé</MenuItem>
                {methods.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Compte de trésorerie (optionnel)"
                value={expenseForm.treasury_account_id}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, treasury_account_id: e.target.value }))}
                fullWidth
              >
                <MenuItem value="">Non précisé</MenuItem>
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Description (optionnel)"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                multiline
                rows={2}
                fullWidth
              />
              <Button component="label" variant="outlined" startIcon={<AttachFileIcon />}>
                {receiptFile ? receiptFile.name : "Joindre une pièce justificative (optionnel)"}
                <input
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={expenseSubmitting || !selectedCategory}
                startIcon={<DescriptionIcon />}
              >
                {expenseSubmitting
                  ? "Enregistrement..."
                  : !selectedCategory
                    ? "Choisissez une catégorie ci-dessus"
                    : canManage
                      ? "Enregistrer la dépense"
                      : "Déclarer (en attente de confirmation)"}
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Dépenses récentes
            </Typography>
            <Stack divider={<Divider />}>
              {recentExpenses.map((expense) => (
                <Box key={expense.id} sx={{ py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {expense.expense_category?.name ?? "Sans catégorie"} — {expense.supplier_name || "Sans fournisseur"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(expense.expense_date).toLocaleDateString("fr-FR")}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="error.main" sx={{ whiteSpace: "nowrap" }}>
                    -{Number(expense.amount).toLocaleString()} FCFA
                  </Typography>
                </Box>
              ))}
              {recentExpenses.length === 0 && (
                <Typography color="text.secondary" sx={{ py: 1.5 }}>
                  Aucune dépense pour l'instant.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 4 }} gutterBottom>
        Journal des dépenses
      </Typography>
      <TextField
        select
        label="Statut"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        size="small"
        sx={{ mb: 2, minWidth: 220 }}
      >
        <MenuItem value="">Toutes</MenuItem>
        <MenuItem value="0">En attente</MenuItem>
        <MenuItem value="1">Confirmée</MenuItem>
        <MenuItem value="2">Rejetée</MenuItem>
      </TextField>

      {expensesLoading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5}>
          {(expenses ?? []).map((expense) => (
            <Card key={expense.id} variant="outlined">
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2">
                    {expense.expense_category?.name ?? "Sans catégorie"} —{" "}
                    {Number(expense.amount).toLocaleString()} FCFA
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(expense.expense_date).toLocaleDateString("fr-FR")} ·{" "}
                    {expense.supplier_name || "Sans fournisseur"}
                    {expense.treasury_account?.name ? ` · ${expense.treasury_account.name}` : ""}
                  </Typography>
                </Box>
                {expense.receipt_path && (
                  <IconButton
                    size="small"
                    component="a"
                    href={`${api.defaults.baseURL}/schools/${schoolId}/expenses/${expense.id}/receipt`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <AttachFileIcon fontSize="small" />
                  </IconButton>
                )}
                <Chip
                  label={STATUS_LABELS[expense.status]?.label}
                  color={STATUS_LABELS[expense.status]?.color}
                  size="small"
                />
                {canManage && expense.status === 0 && (
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" color="success" onClick={() => confirmExpense(expense.id)}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => rejectExpense(expense.id)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
              </CardContent>
            </Card>
          ))}
          {(expenses ?? []).length === 0 && (
            <Typography color="text.secondary">Aucune dépense pour l'instant.</Typography>
          )}
        </Stack>
      )}

      {lastPage > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination count={lastPage} page={page} onChange={(_, value) => setPage(value)} color="primary" />
        </Stack>
      )}

      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Catégories de dépense</DialogTitle>
        <DialogContent>
          <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 2 }}>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setCategoryModalOpen(true)}>
              Ajouter
            </Button>
          </Stack>
          <Stack spacing={1.5}>
            {categories.map((c) => (
              <Card key={c.id} variant="outlined">
                <CardContent
                  sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}
                >
                  <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                    {c.name}
                  </Typography>
                  <IconButton size="small" onClick={() => deleteCategory(c.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardContent>
              </Card>
            ))}
            {categories.length === 0 && (
              <Typography color="text.secondary">Aucune catégorie configurée.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfigDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={categoryModalOpen} onClose={closeCategoryModal} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter une catégorie de dépense</DialogTitle>
        <Box component="form" onSubmit={handleCreateCategory}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {categoryError && <Alert severity="error">{categoryError}</Alert>}
            <TextField
              label="Nom"
              placeholder="Fournitures, Eau, Électricité..."
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
    </Box>
  );
}
