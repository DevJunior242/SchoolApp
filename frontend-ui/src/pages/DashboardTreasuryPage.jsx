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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PaymentsIcon from "@mui/icons-material/Payments";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { useSchools } from "../hooks/useSchools.js";

const MOVEMENT_TYPES = [
  { value: "DEPOSIT", label: "Dépôt" },
  { value: "WITHDRAWAL", label: "Retrait" },
  { value: "TRANSFER_IN", label: "Transfert entrant" },
  { value: "TRANSFER_OUT", label: "Transfert sortant" },
  { value: "ADJUSTMENT", label: "Correction de solde" },
];

const CREDIT_TYPES = ["DEPOSIT", "TRANSFER_IN"];

function emptyAccountForm() {
  return { name: "", type: "CASH", opening_balance: "" };
}

function emptyMovementForm() {
  return { type: "DEPOSIT", amount: "", note: "" };
}

export default function DashboardTreasuryPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const { schoolUsers } = useSchools();
  const currentRole = schoolUsers.find((su) => su?.school?.id === schoolId)?.role?.slug;
  const canManage = ["directeur", "comptable"].includes(currentRole ?? "");

  const {
    data: accountsData,
    loading: accountsLoading,
    error: accountsError,
    reload: reloadAccounts,
  } = useApiGet(schoolId ? `/schools/${schoolId}/treasury-accounts` : null);
  const accounts = accountsData ?? [];

  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  const {
    data: movementsData,
    loading: movementsLoading,
    error: movementsError,
    reload: reloadMovements,
  } = useApiGet(
    selectedAccountId ? `/schools/${schoolId}/treasury-accounts/${selectedAccountId}/movements` : null,
  );
  const movements = movementsData?.data ?? [];

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccountForm());
  const [accountError, setAccountError] = useState(null);

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState(emptyMovementForm());
  const [movementError, setMovementError] = useState(null);
  const [movementSubmitting, setMovementSubmitting] = useState(false);

  function closeAccountModal() {
    setAccountModalOpen(false);
    setAccountForm(emptyAccountForm());
    setAccountError(null);
  }

  async function handleCreateAccount(e) {
    e.preventDefault();
    setAccountError(null);
    try {
      await api.post(`/schools/${schoolId}/treasury-accounts`, accountForm);
      reloadAccounts();
      closeAccountModal();
    } catch {
      setAccountError("Impossible de créer ce compte.");
    }
  }

  async function deleteAccount(id) {
    await api.delete(`/schools/${schoolId}/treasury-accounts/${id}`);
    if (selectedAccountId === id) setSelectedAccountId(null);
    reloadAccounts();
  }

  function closeMovementModal() {
    setMovementModalOpen(false);
    setMovementForm(emptyMovementForm());
    setMovementError(null);
  }

  async function handleCreateMovement(e) {
    e.preventDefault();
    setMovementError(null);
    setMovementSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/treasury-accounts/${selectedAccountId}/movements`, movementForm);
      reloadMovements();
      reloadAccounts();
      closeMovementModal();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setMovementError(
        messages ? Object.values(messages).flat().join(" ") : "Impossible d'enregistrer ce mouvement.",
      );
    } finally {
      setMovementSubmitting(false);
    }
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (selectedAccount) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => setSelectedAccountId(null)} sx={{ mb: 2 }}>
          Retour aux comptes
        </Button>

        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {selectedAccount.name}
            </Typography>
            <Typography color="text.secondary">
              {selectedAccount.type === "CASH" ? "Caisse" : "Compte bancaire"} · Solde actuel :{" "}
              <strong>{Number(selectedAccount.balance ?? 0).toLocaleString()} FCFA</strong>
            </Typography>
          </Box>
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setMovementModalOpen(true)}>
              Ajouter un mouvement
            </Button>
          )}
        </Stack>

        {movementsError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {movementsError}
          </Alert>
        )}

        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
          Mouvements manuels
        </Typography>
        {movementsLoading ? (
          <Typography color="text.secondary">Chargement...</Typography>
        ) : (
          <Stack spacing={1.5}>
            {movements.map((movement) => (
              <Card key={movement.id} variant="outlined">
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                    <Typography variant="subtitle2">
                      {MOVEMENT_TYPES.find((t) => t.value === movement.type)?.label ?? movement.type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {movement.note || "Sans note"} · {movement.created_by?.fullname ?? "—"}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${CREDIT_TYPES.includes(movement.type) ? "+" : "-"}${Number(movement.amount).toLocaleString()} FCFA`}
                    color={CREDIT_TYPES.includes(movement.type) ? "success" : "error"}
                    size="small"
                  />
                </CardContent>
              </Card>
            ))}
            {movements.length === 0 && (
              <Typography color="text.secondary">Aucun mouvement manuel pour ce compte.</Typography>
            )}
          </Stack>
        )}

        <Dialog open={movementModalOpen} onClose={closeMovementModal} fullWidth maxWidth="xs">
          <DialogTitle>Ajouter un mouvement</DialogTitle>
          <Box component="form" onSubmit={handleCreateMovement}>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {movementError && <Alert severity="error">{movementError}</Alert>}
              <TextField
                select
                label="Type"
                value={movementForm.type}
                onChange={(e) => setMovementForm((prev) => ({ ...prev, type: e.target.value }))}
                required
                fullWidth
              >
                {MOVEMENT_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Montant (FCFA)"
                type="number"
                value={movementForm.amount}
                onChange={(e) => setMovementForm((prev) => ({ ...prev, amount: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Note (optionnel)"
                value={movementForm.note}
                onChange={(e) => setMovementForm((prev) => ({ ...prev, note: e.target.value }))}
                multiline
                rows={2}
                fullWidth
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={closeMovementModal}>Annuler</Button>
              <Button type="submit" variant="contained" disabled={movementSubmitting}>
                {movementSubmitting ? "Enregistrement..." : "Ajouter"}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Trésorerie
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Caisses et comptes bancaires de l'école, avec leur solde calculé à partir des paiements et dépenses
            confirmés.
          </Typography>
        </Box>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAccountModalOpen(true)}>
            Ajouter un compte
          </Button>
        )}
      </Stack>

      {accountsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {accountsError}
        </Alert>
      )}

      {accountsLoading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Grid container spacing={2}>
          {accounts.map((account) => (
            <Grid key={account.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent
                  sx={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 1 }}
                  onClick={() => setSelectedAccountId(account.id)}
                >
                  <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                    {account.type === "CASH" ? (
                      <PaymentsIcon color="primary" fontSize="small" />
                    ) : (
                      <AccountBalanceIcon color="primary" fontSize="small" />
                    )}
                    <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                      {account.name}
                    </Typography>
                    {canManage && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAccount(account.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                  <Typography variant="h6" fontWeight={700}>
                    {Number(account.balance ?? 0).toLocaleString()} FCFA
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {accounts.length === 0 && (
            <Grid size={12}>
              <Typography color="text.secondary">Aucun compte de trésorerie configuré.</Typography>
            </Grid>
          )}
        </Grid>
      )}

      <Dialog open={accountModalOpen} onClose={closeAccountModal} fullWidth maxWidth="xs">
        <DialogTitle>Ajouter un compte de trésorerie</DialogTitle>
        <Box component="form" onSubmit={handleCreateAccount}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {accountError && <Alert severity="error">{accountError}</Alert>}
            <TextField
              label="Nom"
              placeholder="Caisse principale, Compte BOA..."
              value={accountForm.name}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Type"
              value={accountForm.type}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, type: e.target.value }))}
              required
              fullWidth
            >
              <MenuItem value="CASH">Caisse</MenuItem>
              <MenuItem value="BANK">Compte bancaire</MenuItem>
            </TextField>
            <TextField
              label="Solde initial (FCFA)"
              type="number"
              value={accountForm.opening_balance}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, opening_balance: e.target.value }))}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeAccountModal}>Annuler</Button>
            <Button type="submit" variant="contained">
              Ajouter
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
