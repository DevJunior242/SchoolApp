import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import {
  Link as RouterLink,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import api from "../api/axios.jsx";

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/member-invitations/accept", {
        token,
        fullname,
        email: email || undefined,
        phone: phone || undefined,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccess(true);
    } catch (requestError) {
      const messages = requestError.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : requestError.response?.data?.message ||
              "Cette invitation est invalide ou expirée.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{ minHeight: "80vh", display: "grid", placeItems: "center", p: 2 }}
    >
      <Paper
        variant="outlined"
        sx={{ width: "100%", maxWidth: 460, p: { xs: 3, sm: 4 } }}
      >
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Activer votre compte
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Définissez votre mot de passe pour rejoindre votre école. Le lien
          expire après 24 heures.
        </Typography>

        {!token && <Alert severity="error">Lien d’invitation incomplet.</Alert>}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Votre demande a été envoyée. L’administration doit maintenant
              valider votre accès.
            </Alert>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              fullWidth
            >
              Aller à la connexion
            </Button>
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "grid", gap: 2 }}
          >
            <TextField
              label="Nom complet"
              value={fullname}
              onChange={(event) => setFullname(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required={!phone}
              fullWidth
            />
            <TextField
              label="Téléphone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required={!email}
              fullWidth
            />
            <TextField
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              fullWidth
              helperText="8 caractères minimum"
            />
            <TextField
              label="Confirmer le mot de passe"
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!token || submitting}
            >
              {submitting ? "Activation..." : "Activer mon compte"}
            </Button>
            <Button onClick={() => navigate("/login")} color="inherit">
              Retour à la connexion
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
