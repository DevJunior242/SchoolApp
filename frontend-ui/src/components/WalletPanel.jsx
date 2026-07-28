import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api/axios.jsx";
import { useApiGet } from "../hooks/useApiGet.js";

const STATUS_LABELS = {
  0: { label: "En attente de confirmation", color: "warning" },
  1: { label: "Confirmé", color: "success" },
  2: { label: "Rejeté", color: "error" },
};

const TYPE_LABELS = { 1: "Recharge", 2: "Repas" };

function emptyForm() {
  return {
    payment_method_id: "",
    amount: "",
    sender_number: "",
    transaction_id: "",
  };
}

/**
 * Solde + recharge + historique du portefeuille cantine d'un élève.
 * Réutilisé par la page staff (studentId depuis l'URL) et la page parent
 * (studentId depuis l'onglet enfant sélectionné).
 */
export default function WalletPanel({ schoolId, student }) {
  const { data, loading, error, reload } = useApiGet(
    `/schools/${schoolId}/students/${student.id}/wallet`,
  );
  const { data: methods } = useApiGet(`/schools/${schoolId}/payment-methods`);

  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.post(
        `/schools/${schoolId}/students/${student.id}/wallet/recharge`,
        form,
      );
      await reload();
      setForm(emptyForm());
      setSuccess("Recharge déclarée.");
    } catch (err) {
      const messages = err.response?.data?.errors;
      setFormError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible de déclarer cette recharge.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <Typography color="text.secondary">Chargement...</Typography>;

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {error}
      </Alert>
    );
  }

  const wallet = data?.wallet;
  const transactions = data?.transactions ?? [];
  const methodList = methods ?? [];

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Solde de {student.fullname}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={700}
            color={Number(wallet?.balance) < 0 ? "error.main" : "text.primary"}
          >
            {Number(wallet?.balance ?? 0).toLocaleString()} FCFA
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recharger
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Après avoir envoyé l'argent via un des moyens ci-dessous, indiquez
            ici les détails pour confirmation.
          </Typography>
          {methodList.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Aucun moyen de paiement configuré par l'école pour l'instant.
            </Alert>
          )}
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              select
              label="Moyen de paiement utilisé"
              value={form.payment_method_id}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  payment_method_id: e.target.value,
                }))
              }
              required
              fullWidth
              disabled={methodList.length === 0}
            >
              {methodList.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name} {m.number ? `(${m.number})` : ""}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Montant envoyé (FCFA)"
              type="number"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              required
              fullWidth
            />
            <TextField
              label="Votre numéro (celui qui a envoyé)"
              value={form.sender_number}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sender_number: e.target.value }))
              }
              required
              fullWidth
            />
            <TextField
              label="ID de transaction (optionnel)"
              value={form.transaction_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, transaction_id: e.target.value }))
              }
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || methodList.length === 0}
            >
              {submitting ? "Envoi..." : "Déclarer la recharge"}
            </Button>
          </Box>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Typography variant="h6" gutterBottom>
          Historique
        </Typography>
        <Stack spacing={1.5}>
          {transactions.map((t) => (
            <Card key={t.id} variant="outlined">
              <CardContent
                sx={{ display: "flex", alignItems: "center", gap: 2 }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2">
                    {TYPE_LABELS[t.type]} — {t.type === 2 ? "-" : "+"}
                    {Number(t.amount).toLocaleString()} FCFA
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(t.created_at).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {t.payment_method ? ` · ${t.payment_method?.name}` : ""}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </Typography>
                </Box>
                <Chip
                  label={STATUS_LABELS[t.status]?.label}
                  color={STATUS_LABELS[t.status]?.color}
                  size="small"
                />
              </CardContent>
            </Card>
          ))}
          {transactions.length === 0 && (
            <Typography color="text.secondary">
              Aucune transaction pour l'instant.
            </Typography>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
}
