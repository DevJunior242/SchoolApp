import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Navigate } from "react-router-dom";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";

const EMPTY = {
  name: "",
  monthly_amount: "",
  monthly_enabled: true,
  annual_enabled: false,
  annual_discount_enabled: false,
  annual_discount_percentage: 0,
  currency: "FCFA",
  max_staff_accounts: "",
  modules: "basic",
  active: true,
};

function formatAmount(amount) {
  return Number(amount ?? 0).toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  });
}

export default function SuperAdminSchoolPricingPlansPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.slug === "superadmin";
  const {
    data: plans,
    loading,
    error,
    reload,
  } = useApiGet(isSuperAdmin ? "/admin/school-pricing-plans" : null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  function change(field) {
    return (event) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function edit(plan) {
    setEditingId(plan.id);
    const annualOnly = plan.annual_enabled && !plan.monthly_enabled;
    setForm({
      name: plan.name,
      monthly_amount: annualOnly
        ? (plan.annual_base_amount ?? Number(plan.monthly_amount) * 12)
        : plan.monthly_amount,
      monthly_enabled: plan.monthly_enabled,
      annual_enabled: plan.annual_enabled,
      annual_discount_enabled: plan.annual_discount_enabled,
      annual_discount_percentage: plan.annual_discount_percentage,
      currency: plan.currency,
      max_staff_accounts: plan.max_staff_accounts ?? "",
      modules: (plan.modules ?? []).join(", "),
      active: plan.active,
    });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    const annualOnly = form.annual_enabled && !form.monthly_enabled;
    const enteredPrice = Number(form.monthly_amount);
    const monthlyAmount = annualOnly ? enteredPrice / 12 : enteredPrice;

    const payload = {
      name: form.name.trim(),
      monthly_amount: monthlyAmount,
      annual_base_amount: annualOnly ? enteredPrice : null,
      monthly_enabled: form.monthly_enabled,
      annual_enabled: form.annual_enabled,
      annual_discount_enabled:
        form.annual_enabled && Number(form.annual_discount_percentage) > 0,
      annual_discount_percentage: Number(form.annual_discount_percentage),
      currency: form.currency.trim(),
      max_staff_accounts:
        form.max_staff_accounts === "" ? null : Number(form.max_staff_accounts),
      modules: form.modules
        .split(",")
        .map((module) => module.trim())
        .filter(Boolean),
      active: form.active,
    };
    try {
      if (editingId)
        await api.put(`/admin/school-pricing-plans/${editingId}`, payload);
      else await api.post("/admin/school-pricing-plans", payload);
      reset();
      await reload();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setActionError(
        messages
          ? Object.values(messages).flat().join(" ")
          : err.response?.data?.message || "Impossible d'enregistrer ce tarif.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAnnualDiscount(plan) {
    setActionError(null);
    try {
      await api.put(`/admin/school-pricing-plans/${plan.id}`, {
        name: plan.name,
        monthly_amount: plan.monthly_amount,
        annual_base_amount: plan.annual_base_amount,
        monthly_enabled: plan.monthly_enabled,
        annual_enabled: plan.annual_enabled,
        annual_discount_enabled: !plan.annual_discount_enabled,
        annual_discount_percentage: plan.annual_discount_percentage,
        currency: plan.currency,
        max_staff_accounts: plan.max_staff_accounts,
        modules: plan.modules ?? [],
        active: plan.active,
      });
      await reload();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setActionError(
        messages
          ? Object.values(messages).flat().join(" ")
          : err.response?.data?.message ||
              "Impossible de modifier la réduction.",
      );
    }
  }

  async function remove(plan) {
    setActionError(null);
    try {
      await api.delete(`/admin/school-pricing-plans/${plan.id}`);
      await reload();
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Impossible de supprimer ce tarif.",
      );
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Tarifs SaaS école
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Gérez les noms, prix, modules et limites de comptes du personnel. Les
        clés d'activation autorisent l'accès mais ne sont liées à aucun tarif.
      </Typography>
      {(error || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || actionError}
        </Alert>
      )}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent component="form" onSubmit={save}>
          <Stack spacing={2}>
            <Typography fontWeight={700}>
              {editingId ? "Modifier le tarif" : "Créer un tarif"}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Nom"
                value={form.name}
                onChange={change("name")}
                required
                fullWidth
              />
              <TextField
                label={
                  form.annual_enabled && !form.monthly_enabled
                    ? "Prix annuel de base"
                    : "Prix mensuel"
                }
                type="number"
                placeholder={
                  form.annual_enabled && !form.monthly_enabled
                    ? "Ex : 250000"
                    : "Ex : 25000"
                }
                value={form.monthly_amount}
                onChange={change("monthly_amount")}
                required
                fullWidth
              />
              <TextField
                label="Devise"
                value={form.currency}
                onChange={change("currency")}
                required
                sx={{ minWidth: 120 }}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.monthly_enabled}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        monthly_enabled: true,
                        annual_enabled: false,
                        annual_discount_enabled: false,
                        annual_discount_percentage: 0,
                      }))
                    }
                  />
                }
                label="Autoriser le paiement mensuel"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.annual_enabled}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        monthly_enabled: false,
                        annual_enabled: true,
                      }))
                    }
                  />
                }
                label="Autoriser le paiement annuel"
              />
              {form.annual_enabled && (
                <TextField
                  label="Réduction annuelle (%)"
                  type="number"
                  inputProps={{ min: 0, max: 99.99, step: 0.01 }}
                  value={form.annual_discount_percentage}
                  onChange={change("annual_discount_percentage")}
                  helperText="Ex : 15 = 15 %"
                  sx={{ minWidth: 220 }}
                />
              )}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Maximum comptes personnel"
                type="number"
                value={form.max_staff_accounts}
                onChange={change("max_staff_accounts")}
                helperText="Vide = illimité"
                fullWidth
              />
              <TextField
                label="Modules, séparés par des virgules"
                value={form.modules}
                onChange={change("modules")}
                helperText="Ex: basic, ai, library"
                fullWidth
              />
            </Stack>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
              }
              label="Tarif disponible à la souscription"
            />
            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving
                  ? "Enregistrement..."
                  : editingId
                    ? "Enregistrer"
                    : "Créer"}
              </Button>
              {editingId && <Button onClick={reset}>Annuler</Button>}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5}>
          {(plans ?? []).map((plan) => (
            <Card key={plan.id} variant="outlined">
              <CardContent
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography fontWeight={700}>{plan.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {plan.monthly_enabled &&
                      `${formatAmount(plan.monthly_amount)} ${plan.currency} / mois`}
                    {plan.monthly_enabled && plan.annual_enabled && " · "}
                    {plan.annual_enabled &&
                      `${formatAmount(plan.annual_amount)} ${plan.currency} / an`}
                    {plan.annual_enabled &&
                      plan.annual_discount_percentage > 0 &&
                      ` (-${plan.annual_discount_percentage}%)`}
                    {" · "}
                    {plan.max_staff_accounts ?? "illimité"} comptes personnel ·{" "}
                    {plan.schools_count} école(s)
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={plan.annual_discount_enabled}
                      onChange={() => toggleAnnualDiscount(plan)}
                      disabled={!plan.annual_enabled}
                    />
                  }
                  label="Réduction annuelle active"
                />
                <Button size="small" onClick={() => edit(plan)}>
                  Modifier
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => remove(plan)}
                  disabled={plan.schools_count > 0}
                >
                  Supprimer
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
