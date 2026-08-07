import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PaymentsIcon from "@mui/icons-material/Payments";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { useSchools } from "../hooks/useSchools.js";

const CREDIT_TYPES = ["DEPOSIT", "TRANSFER_IN"];

function emptyAccountForm(defaultType = "CASH") {
  return { name: "", type: defaultType, opening_balance: "" };
}

function emptyMvtForm() {
  return { amount: "", note: "" };
}

function emptyTransferForm() {
  return { from: "", to: "", amount: "" };
}

function AccountCard({ schoolId, account, canManage, onDeleted, onChanged }) {
  const { data: movementsData, reload: reloadMovements } = useApiGet(
    `/schools/${schoolId}/treasury-accounts/${account.id}/movements`,
    { params: { per_page: 6 } },
  );
  const movements = movementsData?.data ?? [];

  const [mvtForm, setMvtForm] = useState(emptyMvtForm());
  const [mvtError, setMvtError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitMovement(type) {
    setMvtError(null);
    if (!mvtForm.amount || !mvtForm.note) {
      setMvtError("Montant et motif requis.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/treasury-accounts/${account.id}/movements`, {
        type,
        amount: mvtForm.amount,
        note: mvtForm.note,
      });
      setMvtForm(emptyMvtForm());
      reloadMovements();
      onChanged();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setMvtError(messages ? Object.values(messages).flat().join(" ") : "Impossible d'enregistrer ce mouvement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1, mb: 1 }}>
          {account.type === "CASH" ? (
            <PaymentsIcon color="primary" fontSize="small" />
          ) : (
            <AccountBalanceIcon color="primary" fontSize="small" />
          )}
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            {account.name}
          </Typography>
          {canManage && (
            <IconButton size="small" onClick={() => onDeleted(account.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
          {Number(account.balance ?? 0).toLocaleString()} FCFA
        </Typography>

        {canManage && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              size="small"
              type="number"
              placeholder="Montant"
              value={mvtForm.amount}
              onChange={(e) => setMvtForm((prev) => ({ ...prev, amount: e.target.value }))}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              placeholder="Motif"
              value={mvtForm.note}
              onChange={(e) => setMvtForm((prev) => ({ ...prev, note: e.target.value }))}
              sx={{ flex: 1 }}
            />
            <IconButton
              size="small"
              color="success"
              disabled={submitting}
              onClick={() => submitMovement("DEPOSIT")}
              title="Entrée"
            >
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              disabled={submitting}
              onClick={() => submitMovement("WITHDRAWAL")}
              title="Sortie"
            >
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
        {mvtError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {mvtError}
          </Alert>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700 }}>
          Historique
        </Typography>
        <Stack divider={<Divider />} sx={{ mt: 1 }}>
          {movements.map((m) => (
            <Stack key={m.id} direction="row" sx={{ alignItems: "center", gap: 1.5, py: 1 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {m.note || "Sans note"}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                fontWeight={700}
                color={CREDIT_TYPES.includes(m.type) ? "success.main" : "error.main"}
              >
                {CREDIT_TYPES.includes(m.type) ? "+" : "-"}
                {Number(m.amount).toLocaleString()} FCFA
              </Typography>
            </Stack>
          ))}
          {movements.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              Aucun mouvement.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DashboardTreasuryPage({ embedded = false, typeFilter = null } = {}) {
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
  const accounts = (accountsData ?? []).filter((a) => !typeFilter || a.type === typeFilter);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccountForm(typeFilter ?? "CASH"));
  const [accountError, setAccountError] = useState(null);

  const [transferForm, setTransferForm] = useState(emptyTransferForm);
  const [transferError, setTransferError] = useState(null);
  const [transferSuccess, setTransferSuccess] = useState(null);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  // Défauts dérivés à l'affichage (pas stockés en state) : dès que les
  // comptes chargent, les selects sont déjà pré-remplis sans effet ni
  // synchronisation manuelle.
  const transferFrom = transferForm.from || accounts[0]?.id || "";
  const transferTo = transferForm.to || accounts[1]?.id || accounts[0]?.id || "";

  function closeAccountModal() {
    setAccountModalOpen(false);
    setAccountForm(emptyAccountForm(typeFilter ?? "CASH"));
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
    reloadAccounts();
  }

  async function handleTransfer(e) {
    e.preventDefault();
    setTransferError(null);
    setTransferSuccess(null);
    if (transferFrom === transferTo) {
      setTransferError("Choisissez deux comptes différents.");
      return;
    }
    setTransferSubmitting(true);
    try {
      const fromName = accounts.find((a) => a.id === transferFrom)?.name ?? "";
      const toName = accounts.find((a) => a.id === transferTo)?.name ?? "";
      await api.post(`/schools/${schoolId}/treasury-accounts/${transferFrom}/movements`, {
        type: "TRANSFER_OUT",
        amount: transferForm.amount,
        note: `Virement vers ${toName}`,
      });
      await api.post(`/schools/${schoolId}/treasury-accounts/${transferTo}/movements`, {
        type: "TRANSFER_IN",
        amount: transferForm.amount,
        note: `Virement depuis ${fromName}`,
      });
      setTransferSuccess("Virement effectué.");
      setTransferForm((prev) => ({ ...prev, amount: "" }));
      reloadAccounts();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setTransferError(messages ? Object.values(messages).flat().join(" ") : "Impossible d'effectuer ce virement.");
    } finally {
      setTransferSubmitting(false);
    }
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
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
        {embedded ? (
          <Box />
        ) : (
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Trésorerie
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Caisses et comptes bancaires de l'école, avec leur solde calculé à partir des paiements et dépenses
              confirmés.
            </Typography>
          </Box>
        )}
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
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {accounts.map((account) => (
            <Grid key={account.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <AccountCard
                schoolId={schoolId}
                account={account}
                canManage={canManage}
                onDeleted={deleteAccount}
                onChanged={reloadAccounts}
              />
            </Grid>
          ))}
          {accounts.length === 0 && (
            <Grid size={12}>
              <Typography color="text.secondary">Aucun compte de trésorerie configuré.</Typography>
            </Grid>
          )}
        </Grid>
      )}

      {canManage && accounts.length > 1 && (
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 480 }}>
          <Typography variant="h6" gutterBottom>
            Virement interne
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Transférez des fonds entre deux comptes de l'établissement.
          </Typography>
          {transferError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {transferError}
            </Alert>
          )}
          {transferSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {transferSuccess}
            </Alert>
          )}
          <Box component="form" onSubmit={handleTransfer} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Du compte"
                value={transferFrom}
                onChange={(e) => setTransferForm((prev) => ({ ...prev, from: e.target.value }))}
                fullWidth
              >
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Vers le compte"
                value={transferTo}
                onChange={(e) => setTransferForm((prev) => ({ ...prev, to: e.target.value }))}
                fullWidth
              >
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Montant (FCFA)"
              type="number"
              value={transferForm.amount}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, amount: e.target.value }))}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" startIcon={<SwapHorizIcon />} disabled={transferSubmitting}>
              {transferSubmitting ? "Virement..." : "Virer"}
            </Button>
          </Box>
        </Paper>
      )}

      <Dialog open={accountModalOpen} onClose={closeAccountModal} fullWidth maxWidth="xs">
        <DialogTitle>
          {typeFilter === "CASH" && "Ajouter une caisse"}
          {typeFilter === "BANK" && "Ajouter un compte bancaire"}
          {!typeFilter && "Ajouter un compte de trésorerie"}
        </DialogTitle>
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
            {!typeFilter && (
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
            )}
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
