import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "motion/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    terms_accepted: false,
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Inscription impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 4,
      }}
    >
      <motion.div
        style={{ width: "100%", maxWidth: 380 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: "100%" }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Créer un compte
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              id="fullname"
              label="Nom complet"
              value={form.fullname}
              onChange={handleChange("fullname")}
              required
              fullWidth
            />
            <TextField
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              required
              fullWidth
            />
            <TextField
              id="phone"
              label="Téléphone"
              value={form.phone}
              onChange={handleChange("phone")}
              fullWidth
            />
            <TextField
              id="password"
              label="Mot de passe"
              type="password"
              value={form.password}
              onChange={handleChange("password")}
              required
              fullWidth
            />
            <TextField
              id="password_confirmation"
              label="Confirmer le mot de passe"
              type="password"
              value={form.password_confirmation}
              onChange={handleChange("password_confirmation")}
              required
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.terms_accepted}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, terms_accepted: e.target.checked }))
                  }
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  J'accepte les{" "}
                  <RouterLink to="/terms" target="_blank">
                    CGU
                  </RouterLink>{" "}
                  et la{" "}
                  <RouterLink to="/privacy" target="_blank">
                    politique de confidentialité
                  </RouterLink>
                </Typography>
              }
            />
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !form.terms_accepted}
              fullWidth
            >
              {submitting ? "Création..." : "Créer mon compte"}
            </Button>
            <Button component={RouterLink} to="/login" variant="text" fullWidth>
              J'ai déjà un compte
            </Button>
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
}
