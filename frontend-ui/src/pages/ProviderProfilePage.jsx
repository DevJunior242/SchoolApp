import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api/axios.jsx";
import { useApiGet } from "../hooks/useApiGet.js";

const CATEGORY_LABELS = {
  1: "Enseignant",
  2: "Formateur",
  3: "Chauffeur",
  4: "Fournisseur",
  5: "Imprimeur",
  6: "Librairie",
};

const STATUS_LABELS = {
  1: { label: "En attente de validation", color: "default" },
  2: { label: "Approuvée", color: "success" },
  3: { label: "Rejetée", color: "error" },
};

const PAYMENT_STATUS_LABELS = {
  1: { label: "En attente", color: "default" },
  2: { label: "Confirmé", color: "success" },
  3: { label: "Rejeté", color: "error" },
};

const PERIOD_LABELS = { 1: "mensuelle", 2: "annuelle" };

export default function ProviderProfilePage() {
  const {
    data: provider,
    loading,
    error,
    reload,
  } = useApiGet("/marketplace/my-provider");
  const { data: plans } = useApiGet("/marketplace/plans");
  const { data: methods } = useApiGet("/marketplace/payment-methods");

  const [form, setForm] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [planId, setPlanId] = useState("");
  const [methodId, setMethodId] = useState("");
  const [reference, setReference] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState(null);

  const selectedMethod = methods?.find((m) => m.id === methodId);

  // Ajustement pendant le rendu : initialise le formulaire une fois la
  // fiche chargée, sans écraser une saisie en cours.
  if (provider && !initialized) {
    setForm({
      business_name: provider.business_name,
      description: provider.description ?? "",
      city: provider.city ?? "",
      phone: provider.phone ?? "",
      email: provider.email ?? "",
    });
    setInitialized(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.put("/marketplace/my-provider", form);
      await reload();
      setSaved(true);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setFormError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible de mettre à jour la fiche.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReportPayment(e) {
    e.preventDefault();
    setReportError(null);
    setReporting(true);
    try {
      await api.post("/marketplace/my-provider/payments", {
        marketplace_plan_id: planId,
        payment_method_id: methodId || null,
        reference,
      });
      await reload();
      setReference("");
    } catch (err) {
      setReportError(
        err.response?.data?.message || "Impossible de signaler ce paiement.",
      );
    } finally {
      setReporting(false);
    }
  }

  if (loading || !form)
    return <Typography color="text.secondary">Chargement...</Typography>;
  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {error}
      </Alert>
    );
  }

  const hasActiveSubscription =
    provider.subscription_expires_at &&
    new Date(provider.subscription_expires_at) >= new Date();
  const pendingPayment = provider.payments?.find((p) => p.status === 1);

  return (
    <Box sx={{ maxWidth: 600, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Ma fiche prestataire
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 3, flexWrap: "wrap", rowGap: 1 }}
      >
        <Chip
          label={CATEGORY_LABELS[provider.category] ?? provider.category}
          size="small"
        />
        <Chip
          label={STATUS_LABELS[provider.status]?.label}
          color={STATUS_LABELS[provider.status]?.color}
          size="small"
        />
        <Chip
          label={
            hasActiveSubscription
              ? "Visible dans l'annuaire"
              : "Non visible (abonnement inactif)"
          }
          color={hasActiveSubscription ? "success" : "warning"}
          size="small"
        />
      </Stack>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Informations
          </Typography>
          <Box component="form" onSubmit={handleSave}>
            <Stack spacing={2}>
              {formError && <Alert severity="error">{formError}</Alert>}
              {saved && <Alert severity="success">Fiche mise à jour.</Alert>}
              <TextField
                label="Nom / raison sociale"
                value={form.business_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, business_name: e.target.value }))
                }
                required
                fullWidth
              />
              <TextField
                label="Description"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                multiline
                minRows={2}
                fullWidth
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Ville"
                  value={form.city}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, city: e.target.value }))
                  }
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Téléphone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  fullWidth
                />
              </Stack>
              <Box>
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Abonnement
          </Typography>
          {hasActiveSubscription ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Actif jusqu'au{" "}
              {new Date(provider.subscription_expires_at).toLocaleDateString(
                "fr-FR",
              )}
              .
            </Typography>
          ) : (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Aucun abonnement actif — votre fiche n'apparaît pas dans
              l'annuaire des écoles.
            </Typography>
          )}

          {pendingPayment ? (
            <Alert severity="info">
              Un paiement est en attente de confirmation.
            </Alert>
          ) : (
            <Box component="form" onSubmit={handleReportPayment}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choisissez une formule, effectuez le paiement par le moyen
                indiqué, puis signalez-le ici avec la référence.
              </Typography>
              {reportError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {reportError}
                </Alert>
              )}
              <Stack spacing={2}>
                <TextField
                  select
                  label="Formule"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  required
                  fullWidth
                >
                  {(plans ?? []).map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {PERIOD_LABELS[plan.period] ?? plan.period} —{" "}
                      {Number(plan.amount).toLocaleString()} {plan.currency}
                    </MenuItem>
                  ))}
                </TextField>
                {(plans ?? []).length === 0 && (
                  <Alert severity="warning">
                    Aucune formule disponible pour l'instant, revenez plus tard.
                  </Alert>
                )}

                <TextField
                  select
                  label="Moyen de paiement utilisé (optionnel)"
                  value={methodId}
                  onChange={(e) => setMethodId(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="">Non précisé</MenuItem>
                  {(methods ?? []).map((method) => (
                    <MenuItem key={method.id} value={method.id}>
                      {method.name}
                    </MenuItem>
                  ))}
                </TextField>
                {selectedMethod && (
                  <Alert severity="info">
                    {selectedMethod.number && <>{selectedMethod.number}</>}
                    {selectedMethod.number && selectedMethod.instructions
                      ? " — "
                      : ""}
                    {selectedMethod.instructions}
                  </Alert>
                )}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    size="small"
                    placeholder="Référence de transaction (optionnel)"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    fullWidth
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={reporting || !planId}
                  >
                    {reporting ? "Envoi..." : "J'ai payé"}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}

          {provider.payments?.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Historique
              </Typography>
              <Stack spacing={1}>
                {provider.payments.map((p) => (
                  <Stack
                    key={p.id}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                  >
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {Number(p.amount).toLocaleString()}
                      {p.plan
                        ? ` (${PERIOD_LABELS[p.plan?.period] ?? p.plan?.period})`
                        : ""}{" "}
                      — {new Date(p.created_at).toLocaleDateString("fr-FR")}
                    </Typography>
                    <Chip
                      size="small"
                      label={PAYMENT_STATUS_LABELS[p.status]?.label}
                      color={PAYMENT_STATUS_LABELS[p.status]?.color}
                    />
                  </Stack>
                ))}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
