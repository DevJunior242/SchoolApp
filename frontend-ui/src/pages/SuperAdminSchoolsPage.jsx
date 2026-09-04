import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Navigate } from "react-router-dom";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePaginatedList } from "../hooks/usePaginatedList.js";

export default function SuperAdminSchoolsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.slug === "superadmin";
  const {
    data: schools,
    page,
    setPage,
    lastPage,
    total,
    search,
    setSearch,
    loading,
    error,
    reload,
  } = usePaginatedList(isSuperAdmin ? "/admin/schools" : null);
  const { data: pricingPlans } = useApiGet(
    isSuperAdmin ? "/admin/school-pricing-plans" : null,
  );
  const [actingId, setActingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleToggle(school) {
    setActionError(null);
    setActingId(school.id);
    try {
      await api.post(`/admin/schools/${school.id}/toggle-status`);
      await reload();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Impossible de changer le statut de cette école.",
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleReactivate(school) {
    setActionError(null);
    setActingId(school.id);
    try {
      await api.post(`/admin/schools/${school.id}/reactivate`);
      await reload();
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Impossible de réactiver cette école.",
      );
    } finally {
      setActingId(null);
    }
  }

  async function handlePlanChange(school, plan) {
    setActionError(null);
    setActingId(school.id);
    try {
      await api.put(`/admin/schools/${school.id}/plan`, { plan });
      await reload();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Impossible de changer le palier de cette école.",
      );
    } finally {
      setActingId(null);
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Écoles
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Toutes les écoles de la plateforme ({total}), actives ou non.
      </Typography>

      <TextField
        label="Rechercher une école"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 3, maxWidth: 320 }}
        fullWidth
      />

      {(error || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || actionError}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5}>
          {schools.map((school) => (
            <Card key={school.id} variant="outlined">
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 220 }}>
                  <Typography variant="subtitle2">{school.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {school.country?.name}
                    {school.city ? ` · ${school.city}` : ""} · créée le{" "}
                    {new Date(school.created_at).toLocaleDateString("fr-FR")}
                  </Typography>
                  {school.status === 1 && school.trial_ends_at && (
                    <Typography variant="caption" color="text.secondary">
                      Essai gratuit jusqu'au{" "}
                      {new Date(school.trial_ends_at).toLocaleDateString(
                        "fr-FR",
                      )}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={
                    school.status === 1
                      ? "Active"
                      : school.status === 2
                        ? "Lecture seule"
                        : "Désactivée"
                  }
                  color={
                    school.status === 1
                      ? "success"
                      : school.status === 2
                        ? "warning"
                        : "default"
                  }
                  size="small"
                />
                <TextField
                  select
                  label="Palier"
                  value={school.pricing_plan?.slug || school.plan}
                  onChange={(e) => handlePlanChange(school, e.target.value)}
                  disabled={actingId === school.id}
                  size="small"
                  sx={{ minWidth: 160 }}
                >
                  {(pricingPlans ?? []).map((plan) => (
                    <MenuItem key={plan.id} value={plan.slug}>
                      {plan.name}
                    </MenuItem>
                  ))}
                </TextField>
                {school.status === 2 ? (
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    disabled={actingId === school.id}
                    onClick={() => handleReactivate(school)}
                  >
                    Réactiver
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    color={school.status === 1 ? "error" : "success"}
                    disabled={actingId === school.id}
                    onClick={() => handleToggle(school)}
                  >
                    {school.status === 1 ? "Désactiver" : "Activer"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {schools.length === 0 && (
            <Typography color="text.secondary">
              Aucune école trouvée.
            </Typography>
          )}
        </Stack>
      )}

      {lastPage > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination
            count={lastPage}
            page={page}
            onChange={(_, value) => setPage(value)}
          />
        </Stack>
      )}
    </Box>
  );
}
