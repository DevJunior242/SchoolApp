import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Link as RouterLink,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";

const STEPS = ["Informations de l'école", "Activation"];

const ISO3_TO_ISO2 = {
  AGO: "AO", BEN: "BJ", BDI: "BI", BFA: "BF", BWA: "BW", CAF: "CF",
  CIV: "CI", CMR: "CM", COD: "CD", COG: "CG", COM: "KM", CPV: "CV",
  DJI: "DJ", DZA: "DZ", EGY: "EG", ERI: "ER", ETH: "ET", GAB: "GA",
  GHA: "GH", GIN: "GN", GMB: "GM", GNB: "GW", GNQ: "GQ", KEN: "KE",
  LBR: "LR", LBY: "LY", LSO: "LS", MAR: "MA", MDG: "MG", MLI: "ML",
  MOZ: "MZ", MRT: "MR", MUS: "MU", MWI: "MW", NAM: "NA", NER: "NE",
  NGA: "NG", RWA: "RW", SDN: "SD", SEN: "SN", SLE: "SL", SOM: "SO",
  SSD: "SS", STP: "ST", SWZ: "SZ", SYC: "SC", TCD: "TD", TGO: "TG",
  TUN: "TN", TZA: "TZ", UGA: "UG", ZAF: "ZA", ZMB: "ZM", ZWE: "ZW",
};

function countryFlag(isoCode) {
  const iso2 = ISO3_TO_ISO2[isoCode];

  return iso2
    ? String.fromCodePoint(...[...iso2].map((letter) => 127397 + letter.charCodeAt(0)))
    : "";
}

export default function CreateSchoolPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSuperAdmin = user?.role?.slug === "superadmin";
  const { data: countries } = useApiGet("/countries", {
    enabled: Boolean(user),
  });
  const selectedCountry = (countries ?? []).find(
    (country) => country.id === form.country_id,
  );
  const { data: pricingPlans } = useApiGet("/school-pricing-plans");

  const requestedPlan = searchParams.get("plan");
  const planOptions = (pricingPlans ?? [])
    .filter((plan) => plan.monthly_enabled || plan.annual_enabled)
    .map((plan) => ({
      value: plan.id,
      slug: plan.slug,
      label: `${plan.name} — ${Number(plan.monthly_amount).toLocaleString("fr-FR")} ${plan.currency}/mois`,
    }));
  const requestedPlanOption = planOptions.find(
    (plan) => plan.slug === requestedPlan || plan.value === requestedPlan,
  );
  const defaultPlanId = requestedPlanOption?.value || planOptions[0]?.value || "";

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    country_id: "",
    pricing_plan_id: "",
  });
  const [activationKey, setActivationKey] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleNext(e) {
    e.preventDefault();
    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/schools", {
        ...form,
        pricing_plan_id: form.pricing_plan_id || defaultPlanId,
        activation_key: activationKey.trim(),
      });
      await refreshUser();
      navigate("/dashboard/settings");
    } catch (err) {
      if (err.response?.status === 403) {
        setError(
          "Vous devez vérifier votre email avant de créer une école. Consultez votre boîte mail, ou demandez un nouveau lien depuis votre tableau de bord.",
        );
        return;
      }
      const messages = err.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : err.response?.data?.message || "Impossible de créer l'école.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Créer une école
      </Typography>

      {user && isSuperAdmin && (
        <Paper
          variant="outlined"
          sx={(theme) => ({
            p: 4,
            mt: 3,
            borderColor: theme.palette.error.main,
            bgcolor: alpha(theme.palette.error.main, 0.04),
          })}
        >
          <Alert severity="error" sx={{ mb: 2 }}>
            Le superadmin de la plateforme ne peut pas créer une école.
          </Alert>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Vous êtes administrateur plateforme et avez déjà accès au back-office.
          </Typography>
          <Button component={RouterLink} to="/dashboard" variant="contained" fullWidth>
            Retour au tableau de bord
          </Button>
        </Paper>
      )}

      {!user ? (
        <Paper
          variant="outlined"
          sx={(theme) => ({
            p: 4,
            mt: 3,
            bgcolor: alpha(theme.palette.text.primary, 0.03),
          })}
        >
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Connectez-vous ou créez un compte pour créer votre école.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              fullWidth
            >
              Créer un compte
            </Button>
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              fullWidth
            >
              Se connecter
            </Button>
          </Stack>
        </Paper>
      ) : !isSuperAdmin ? (
        <Paper
          variant="outlined"
          sx={(theme) => ({
            p: { xs: 3, md: 4 },
            mt: 3,
            bgcolor: alpha(theme.palette.text.primary, 0.03),
          })}
        >
          <Stepper activeStep={step - 1} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {!planOptions.length && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Aucun tarif n'est actuellement disponible. Le superadmin doit
              d'abord créer un tarif actif.
            </Alert>
          )}

          {step === 1 ? (
            <Box component="form" onSubmit={handleNext}>
              <Stack spacing={2.5}>
                <TextField
                  label="Nom de l'école"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  fullWidth
                  autoFocus
                />
                <TextField
                  select
                  label="Pays"
                  value={form.country_id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, country_id: e.target.value }))
                  }
                  renderValue={() =>
                    selectedCountry
                      ? `${countryFlag(selectedCountry.iso_code)} ${selectedCountry.name}`
                      : ""
                  }
                  required
                  fullWidth
                >
                  {(countries ?? []).map((country) => (
                    <MenuItem key={country.id} value={country.id}>
                      {countryFlag(country.iso_code)} {country.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Palier"
                  value={form.pricing_plan_id || defaultPlanId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      pricing_plan_id: e.target.value,
                    }))
                  }
                  helperText={
                    <>
                      Choisissez selon la taille de votre école — modifiable
                      plus tard.{" "}
                      <RouterLink to="/pricing">
                        Voir le détail des tarifs
                      </RouterLink>
                    </>
                  }
                  required
                  fullWidth
                >
                  {planOptions.map((plan) => (
                    <MenuItem key={plan.value} value={plan.value}>
                      {plan.label}
                    </MenuItem>
                  ))}
                </TextField>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ justifyContent: "flex-end", mt: 1 }}
                >
                  <Button component={RouterLink} to="/">
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={
                      !form.name.trim() ||
                      !form.country_id ||
                      !(form.pricing_plan_id || defaultPlanId)
                    }
                  >
                    Continuer
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <Typography color="text.secondary">
                  Vous avez une clé d'activation fournie par l'équipe INTELLINO
                  ? Entrez-la ici. Sinon, laissez ce champ vide :{" "}
                  <strong>{form.name}</strong> démarrera avec un essai gratuit
                  de 30 jours, sans engagement.
                </Typography>
                <TextField
                  label="Clé d'activation (optionnel)"
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                  placeholder="school-..."
                  fullWidth
                  autoFocus
                />
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ justifyContent: "flex-end", mt: 1 }}
                >
                  <Button onClick={() => setStep(1)}>Retour</Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Création..."
                      : activationKey.trim()
                        ? "Créer l'école"
                        : "Démarrer l'essai gratuit"}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Paper>
      ) : null}
    </Container>
  );
}
