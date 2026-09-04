import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import { alpha } from "@mui/material/styles";
import api from "../api/axios.jsx";

export default function ContactPage() {
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoForm, setDemoForm] = useState({
    school_name: "",
    email: "",
    phone: "",
    description: "",
    company: "", // honeypot anti-bot
  });
  const [demoError, setDemoError] = useState(null);
  const [demoSubmitting, setDemoSubmitting] = useState(false);

  function handleDemoChange(field) {
    return (e) => setDemoForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleDemoSubmit(e) {
    e.preventDefault();
    setDemoError(null);

    if (!demoForm.email.trim() && !demoForm.phone.trim()) {
      setDemoError(
        "Indiquez au moins un email ou un numéro de téléphone pour être recontacté.",
      );
      return;
    }

    setDemoSubmitting(true);
    try {
      await api.post("/demo-requests", demoForm);
      setDemoSubmitted(true);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setDemoError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible d'envoyer la demande.",
      );
    } finally {
      setDemoSubmitting(false);
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 6, md: 10 } }}>
      <Box
        sx={(theme) => ({
          position: "relative",
          backgroundColor: theme.palette.background.default,
          minHeight: { xs: "auto", md: 720 },
        })}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            px: { xs: 0, md: 3 },
            py: { xs: 0, md: 3 },
          }}
        >
          <Box
            sx={{
              maxWidth: 1200,
              mx: "auto",
              p: { xs: 0, md: 3 },
            }}
          >
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: { xs: 2, md: 3 },
                  }}
                >
                  <Typography
                    sx={{
                      color: "primary.main",
                      fontWeight: 700,
                      fontSize: 14,
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                      mb: 1.5,
                    }}
                  >
                    Contactez-nous
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ mb: 2, fontWeight: 700, lineHeight: 1.1 }}
                  >
                    Discutons de votre établissement
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{ mb: 4, fontSize: 18 }}
                  >
                    L’équipe edu.intellino vous accompagne pour la mise en
                    place, la formation du personnel et le suivi de votre
                    solution.
                  </Typography>

                  <Stack spacing={2.5} sx={{ mb: 4 }}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: 2,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: alpha("#2563eb", 0.1),
                          color: "primary.main",
                        }}
                      >
                        <LocationOnOutlinedIcon fontSize="small" />
                      </Box>
                      <Typography color="text.secondary">
                        Ouagadougou, Burkina Faso
                      </Typography>
                    </Box>

                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: 2,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: alpha("#10b981", 0.1),
                          color: "success.main",
                        }}
                      >
                        <PhoneOutlinedIcon fontSize="small" />
                      </Box>
                      <Typography color="text.secondary">
                        +226 56 56 56 70 / +226 58 11 68 11
                      </Typography>
                    </Box>

                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: 2,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: alpha("#f59e0b", 0.12),
                          color: "warning.main",
                        }}
                      >
                        <EmailOutlinedIcon fontSize="small" />
                      </Box>
                      <Box
                        component="a"
                        href="mailto:contact@intellino.tech"
                        sx={{
                          color: "text.secondary",
                          textDecoration: "none",
                          fontWeight: 500,
                          "&:hover": {
                            color: "primary.main",
                            textDecoration: "underline",
                          },
                        }}
                      >
                        contact@intellino.tech
                      </Box>
                    </Box>
                  </Stack>

                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                      px: 2,
                      py: 1,
                      borderRadius: 999,
                      bgcolor: "rgba(37, 99, 235, 0.08)",
                      border: "1px solid rgba(37, 99, 235, 0.15)",
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                        boxShadow: "0 0 0 6px rgba(16, 185, 129, 0.15)",
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ color: "text.primary", fontWeight: 600 }}
                    >
                      Réponse rapide sous 24h
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper
                  elevation={0}
                  sx={(theme) => ({
                    p: { xs: 3, md: 4 },
                    bgcolor: theme.palette.background.paper,
                    borderRadius: 2,
                  })}
                >
                  {demoSubmitted ? (
                    <Box sx={{ textAlign: "center", py: 5 }}>
                      <Typography sx={{ fontSize: 40, mb: 2 }}>✅</Typography>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        Demande envoyée
                      </Typography>
                      <Typography color="text.secondary">
                        Notre équipe vous contactera sous 24h.
                      </Typography>
                    </Box>
                  ) : (
                    <Box component="form" onSubmit={handleDemoSubmit}>
                      <Stack spacing={2.5}>
                        {demoError && (
                          <Alert severity="error">{demoError}</Alert>
                        )}
                        <TextField
                          label="Nom de l'établissement (optionnel)"
                          placeholder="Ex : Lycée Notre-Dame de Bobo"
                          value={demoForm.school_name}
                          onChange={handleDemoChange("school_name")}
                          fullWidth
                        />
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={2}
                        >
                          <TextField
                            label="Téléphone"
                            placeholder="+226 70 00 00 00"
                            value={demoForm.phone}
                            onChange={handleDemoChange("phone")}
                            fullWidth
                          />
                          <TextField
                            label="Email"
                            type="email"
                            placeholder="vous@ecole.bf"
                            value={demoForm.email}
                            onChange={handleDemoChange("email")}
                            fullWidth
                          />
                        </Stack>
                        <TextField
                          label="Votre besoin"
                          placeholder="Décrivez votre établissement et ce que vous cherchez..."
                          value={demoForm.description}
                          onChange={handleDemoChange("description")}
                          multiline
                          minRows={3}
                          required
                          fullWidth
                        />
                        <Box
                          sx={{
                            position: "absolute",
                            left: "-9999px",
                            width: 1,
                            height: 1,
                            overflow: "hidden",
                          }}
                          aria-hidden="true"
                        >
                          <TextField
                            label="Entreprise"
                            name="company"
                            tabIndex={-1}
                            autoComplete="off"
                            value={demoForm.company}
                            onChange={handleDemoChange("company")}
                          />
                        </Box>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          size="large"
                          disabled={demoSubmitting}
                          fullWidth
                          sx={{
                            py: 1.5,
                            borderRadius: 2,
                            fontWeight: 700,
                            textTransform: "none",
                          }}
                        >
                          {demoSubmitting ? "Envoi..." : "Contactez-nous"}
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
