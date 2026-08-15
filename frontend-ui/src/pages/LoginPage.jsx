import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import { motion } from "motion/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import intellinoMark from "../assets/intellino-mark.svg";
export default function LoginPage() {
  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // La 2FA se joue en 2 étapes : identifiants d'abord, puis (si le compte
  // l'a activée) un code TOTP ou un code de récupération.
  const [challengeToken, setChallengeToken] = useState(null);
  const [code, setCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.twoFactor) {
        setChallengeToken(result.challengeToken);
      } else {
        navigate("/dashboard");
      }
    } catch {
      setError("Identifiants invalides.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTwoFactorSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyTwoFactor(
        challengeToken,
        useRecoveryCode ? { recovery_code: code } : { code },
      );
      navigate("/dashboard");
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(
        messages ? Object.values(messages).flat().join(" ") : "Code invalide.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function backToCredentials() {
    setChallengeToken(null);
    setCode("");
    setUseRecoveryCode(false);
    setError(null);
  }

  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <motion.div
        style={{ width: "100%", maxWidth: 360 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: "100%" }}>
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              textDecoration: "none",
              mb: 3,
            }}
          >
            <Box
              component="img"
              src={intellinoMark}
              alt="Intellino"
              sx={{ height: 44, width: 44, borderRadius: "12px" }}
            />
            <Typography
              sx={{
                fontWeight: 800,
                color: "text.primary",
                fontSize: "1.3rem",
                letterSpacing: "0.01em",
              }}
            >
              Intell
              <Box component="span" sx={{ color: "primary.main" }}>
                i
              </Box>
              no
            </Typography>
          </Box>
          <Typography variant="h5" component="h1" align="center" gutterBottom>
            {challengeToken ? "Vérification" : "Connexion"}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {challengeToken ? (
            <Box
              component="form"
              onSubmit={handleTwoFactorSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Typography variant="body2" color="text.secondary">
                {useRecoveryCode
                  ? "Entrez l'un de vos codes de récupération."
                  : "Entrez le code à 6 chiffres généré par votre application d'authentification."}
              </Typography>
              <TextField
                label={useRecoveryCode ? "Code de récupération" : "Code"}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                required
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                fullWidth
              >
                {submitting ? "Vérification..." : "Vérifier"}
              </Button>
              <Button
                variant="text"
                size="small"
                fullWidth
                onClick={() => {
                  setUseRecoveryCode((v) => !v);
                  setCode("");
                  setError(null);
                }}
              >
                {useRecoveryCode
                  ? "Utiliser le code de mon application à la place"
                  : "Utiliser un code de récupération"}
              </Button>
              <Button variant="text" size="small" fullWidth onClick={backToCredentials}>
                ← Retour
              </Button>
            </Box>
          ) : (
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              <TextField
                id="password"
                label="Mot de passe"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((show) => !show)}
                          edge="end"
                          aria-label={
                            showPassword
                              ? "Masquer le mot de passe"
                              : "Afficher le mot de passe"
                          }
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                fullWidth
              >
                {submitting ? "Connexion..." : "Se connecter"}
              </Button>
              <Button
                component={RouterLink}
                to="/forgot-password"
                variant="text"
                size="small"
                fullWidth
              >
                Mot de passe oublié ?
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="text"
                fullWidth
              >
                Créer un compte
              </Button>
            </Box>
          )}
        </Paper>
      </motion.div>
    </Box>
  );
}
