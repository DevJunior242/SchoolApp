import { useEffect, useState } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function verify() {
      const id = searchParams.get("id");
      const hash = searchParams.get("hash");
      const expires = searchParams.get("expires");
      const signature = searchParams.get("signature");

      if (!id || !hash || !expires || !signature) {
        setStatus("error");
        setMessage("Lien de vérification incomplet.");
        return;
      }

      try {
        await api.get(`/email/verify/${id}/${hash}`, {
          params: { expires, signature },
        });
        setStatus("success");
        if (user) await refreshUser();
      } catch (err) {
        setStatus("error");
        setMessage(
          err.response?.status === 403
            ? "Ce lien de vérification est invalide ou a expiré."
            : "Impossible de vérifier l'email.",
        );
      }
    }

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 4,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 5 },
          width: "100%",
          maxWidth: 480,
          textAlign: "center",
        }}
      >
        {status === "loading" && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            Vérification en cours...
          </Typography>
        )}

        {status === "success" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Alert severity="success" sx={{ textAlign: "left" }}>
              Votre email a été vérifié avec succès.
            </Alert>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Button
                component={RouterLink}
                to="/create-school"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
              >
                Créer mon école
              </Button>
              <Button
                component={RouterLink}
                to={user ? "/dashboard" : "/login"}
                variant="outlined"
                size="large"
                fullWidth
              >
                {user ? "Aller au tableau de bord" : "Se connecter"}
              </Button>
            </Box>
          </Box>
        )}

        {status === "error" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Alert severity="error" sx={{ textAlign: "left" }}>
              {message}
            </Alert>
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
              size="large"
              fullWidth
            >
              Retour à l'accueil
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
