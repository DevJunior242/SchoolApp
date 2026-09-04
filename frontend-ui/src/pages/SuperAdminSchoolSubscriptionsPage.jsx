import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { Navigate } from "react-router-dom";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";

export default function SuperAdminSchoolSubscriptionsPage() {
  const { user } = useAuth();
  const allowed = user?.role?.slug === "superadmin";
  const {
    data: payments,
    loading,
    error,
    reload,
  } = useApiGet(allowed ? "/admin/school-subscriptions/payments" : null);
  const [actionError, setActionError] = useState(null);
  const [acting, setActing] = useState(null);

  if (!allowed) return <Navigate to="/dashboard" replace />;

  async function review(payment, action) {
    setActing(payment.id);
    setActionError(null);
    try {
      await api.post(
        `/admin/school-subscriptions/payments/${payment.id}/${action}`,
      );
      await reload();
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Impossible de traiter ce paiement.",
      );
    } finally {
      setActing(null);
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Comptabilité SaaS
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Vérifiez les paiements déclarés avant d'activer un nouveau plan.
      </Typography>
      {(error || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || actionError}
        </Alert>
      )}
      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={2}>
          {(payments ?? []).map((payment) => (
            <Card key={payment.id} variant="outlined">
              <CardContent>
                <Typography fontWeight={700}>
                  {payment.subscription?.school?.name} ·{" "}
                  {payment.subscription?.plan?.name}
                </Typography>
                <Typography color="text.secondary">
                  {Number(payment.subscription?.amount).toLocaleString("fr-FR")}{" "}
                  {payment.subscription?.currency} /{" "}
                  {payment.subscription?.billing_cycle === "annual"
                    ? "an"
                    : "mois"}{" "}
                  · {payment.payment_method?.name}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Numéro : {payment.sender_number} · Référence :{" "}
                  {payment.transaction_id || "—"}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={acting === payment.id}
                    onClick={() => review(payment, "confirm")}
                  >
                    Confirmer
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={acting === payment.id}
                    onClick={() => review(payment, "reject")}
                  >
                    Rejeter
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {payments?.length === 0 && (
            <Typography color="text.secondary">
              Aucun paiement à vérifier.
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}
