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

export default function DashboardExpensesPage() {
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

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm());
  const [categoryError, setCategoryError] = useState(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm());
  const [receiptFile, setReceiptFile] = useState(null);
  const [expenseError, setExpenseError] = useState(null);
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

  function closeCategoryModal() {
    setCategoryModalOpen(false);
    setCategoryForm(emptyCategoryForm());
    setCategoryError(null);
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    setCategoryError(null);
    try {
      await api.post(`/schools/${schoolId}/expense-categories`, categoryForm);
      reloadCategories();
      closeCategoryModal();
    } catch {
      setCategoryError("Impossible de créer cette catégorie.");
    }
  }

  async function deleteCategory(id) {
    await api.delete(`/schools/${schoolId}/expense-categories/${id}`);
    reloadCategories();
  }

  function closeExpenseModal() {
    setExpenseModalOpen(false);
    setExpenseForm(emptyExpenseForm());
    setReceiptFile(null);
    setExpenseError(null);
  }

  async function handleCreateExpense(e) {
    e.preventDefault();
    setExpenseError(null);
    setExpenseSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(expenseForm).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      if (receiptFile) formData.append("receipt", receiptFile);

      await api.post(`/schools/${schoolId}/expenses`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      reloadExpenses();
      closeExpenseModal();
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
    reloadExpenses();
  }

  async function rejectExpense(id) {
    await api.post(`/schools/${schoolId}/expenses/${id}/reject`);
    reloadExpenses();
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
        sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Dépenses
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {canManage
              ? "Configurez les catégories de dépense, puis déclarez et confirmez les dépenses de l'école."
              : "Déclarez vos dépenses ; le directeur ou le comptable les confirmera."}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setExpenseModalOpen(true)}>
          Déclarer une dépense
        </Button>
      </Stack>

      {expensesError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {expensesError}
        </Alert>
      )}

      {canManage && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">Catégories de dépense</Typography>
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
            </Paper>
          </Grid>
        </Grid>
      )}

      <Typography variant="h6" gutterBottom>
        Dépenses déclarées
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

      <Dialog open={expenseModalOpen} onClose={closeExpenseModal} fullWidth maxWidth="sm">
        <DialogTitle>Déclarer une dépense</DialogTitle>
        <Box component="form" onSubmit={handleCreateExpense}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {expenseError && <Alert severity="error">{expenseError}</Alert>}
            <TextField
              select
              label="Catégorie"
              value={expenseForm.expense_category_id}
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, expense_category_id: e.target.value }))}
              required
              fullWidth
            >
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Montant (FCFA)"
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Fournisseur (optionnel)"
              value={expenseForm.supplier_name}
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, supplier_name: e.target.value }))}
              fullWidth
            />
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
              select
              label="Moyen de paiement (optionnel)"
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
              label="Description (optionnel)"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
              fullWidth
            />
            <Button component="label" variant="outlined" startIcon={<AttachFileIcon />}>
              {receiptFile ? receiptFile.name : "Joindre un justificatif (optionnel)"}
              <input
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </Button>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeExpenseModal}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={expenseSubmitting}>
              {expenseSubmitting
                ? "Enregistrement..."
                : canManage
                  ? "Enregistrer (confirmée immédiatement)"
                  : "Déclarer (en attente de confirmation)"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
