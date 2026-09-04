import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { useApiGet } from "../hooks/useApiGet.js";

const PLANS = [
  {
    id: "ecole",
    name: "École",
    for: "Petites structures — jusqu'à 150 élèves",
    price: "25 000",
    featured: false,
    features: [
      "Élèves, classes et emplois du temps",
      "Notes, présences et bulletins",
      "Paiement de la scolarité (Mobile Money, espèces)",
      "Comptabilité de base",
      "Événements et messagerie",
      "Jusqu'à 5 comptes personnel",
    ],
  },
  {
    id: "etablissement",
    name: "Établissement",
    for: "Structures moyennes — de 151 à 500 élèves",
    price: "60 000",
    featured: true,
    features: [
      "Comptes personnel illimités",
      "Assistant IA Intellino",
      "Bibliothèque",
      "Cantine scolaire",
      "Infirmerie / suivi santé",
      "Transport scolaire (bus)",
      "Demandes de pré-inscription en ligne",
      "Support prioritaire",
    ],
  },
  {
    id: "reseau",
    name: "Réseau scolaire",
    for: "Groupes et réseaux — 500+ élèves ou plusieurs écoles",
    price: "120 000",
    featured: false,
    features: [
      "Tout Établissement",
      "Tarif dégressif par école supplémentaire",
      "Accompagnement dédié au déploiement",
      "Interlocuteur commercial attitré",
    ],
  },
];

const INCLUDED_EVERYWHERE = [
  "Interface en français, ressources en mooré et dioula",
  "Fonctionne avec une connexion limitée",
  "Paiement par Mobile Money, aucune carte bancaire requise",
  "Mises à jour incluses",
  "Essai gratuit de 30 jours",
  "Résiliable à tout moment",
];

const FAQ = [
  {
    q: "Comment se passe le paiement ?",
    a: "Par Orange Money, Moov Money ou virement. Le paiement est confirmé manuellement par notre équipe — il n'y a pas encore de prélèvement automatique.",
  },
  {
    q: "Puis-je changer de palier plus tard ?",
    a: "Oui, contactez-nous quand votre effectif évolue. Vos données restent intactes lors du changement.",
  },
  {
    q: "Que se passe-t-il à la fin de l'essai gratuit ?",
    a: "Votre école passe en lecture seule (vos données restent consultables, mais plus de nouvelles saisies) jusqu'à confirmation du paiement.",
  },
  {
    q: "Y a-t-il des frais de mise en place ?",
    a: "Non, quel que soit le palier.",
  },
];

export default function PricingPage() {
  const { data: remotePlans } = useApiGet("/school-pricing-plans");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const plans = remotePlans?.length
    ? remotePlans.map((plan) => ({
        id: plan.slug,
        name: plan.name,
        for: plan.max_staff_accounts
          ? `Jusqu'à ${plan.max_staff_accounts} comptes du personnel`
          : "Accès selon les modules inclus",
        monthlyEnabled: plan.monthly_enabled,
        annualEnabled: plan.annual_enabled,
        monthlyPrice: Number(plan.monthly_amount),
        annualPrice: Number(plan.annual_amount),
        annualDiscount: Number(plan.annual_discount_percentage),
        featured: false,
        features: plan.modules ?? [],
      }))
    : PLANS.map((plan) => ({
        ...plan,
        monthlyEnabled: true,
        annualEnabled: false,
        monthlyPrice: Number(plan.price.replaceAll(" ", "")),
        annualPrice: 0,
        annualDiscount: 0,
      }));

  const visiblePlans = plans.filter((plan) =>
    billingCycle === "annual" ? plan.annualEnabled : plan.monthlyEnabled,
  );

  function handleBillingCycleChange(_, value) {
    if (value) setBillingCycle(value);
  }

  return (
    <Box sx={{ bgcolor: "background.default", color: "text.primary" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box sx={{ textAlign: "center", maxWidth: 640, mx: "auto", mb: 6 }}>
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
            Tarifs
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              mb: 2,
              fontSize: { xs: "1.9rem", md: "2.6rem" },
            }}
          >
            Un tarif simple, pensé pour votre établissement
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 17 }}>
            Sans engagement, paiement en FCFA par Mobile Money. Essai gratuit de
            30 jours sur tous les paliers.
          </Typography>
          <ToggleButtonGroup
            value={billingCycle}
            exclusive
            onChange={handleBillingCycleChange}
            color="primary"
            sx={{ mt: 3 }}
            aria-label="Périodicité de paiement"
          >
            <ToggleButton value="monthly" aria-label="Paiement mensuel">
              Mensuel
            </ToggleButton>
            <ToggleButton value="annual" aria-label="Paiement annuel">
              Annuel
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Grid container spacing={3} alignItems="stretch">
          {visiblePlans.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Typography
                color="text.secondary"
                sx={{ textAlign: "center", py: 4 }}
              >
                Aucun tarif annuel n’est disponible pour le moment.
              </Typography>
            </Grid>
          ) : (
            visiblePlans.map((plan) => (
              <Grid key={plan.id} size={{ xs: 12, md: 4 }}>
                <Paper
                  variant="outlined"
                  sx={(theme) => ({
                    p: 3.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    borderColor: plan.featured ? "primary.main" : "divider",
                    borderWidth: plan.featured ? 2 : 1,
                    bgcolor: plan.featured
                      ? alpha(theme.palette.primary.main, 0.04)
                      : "transparent",
                  })}
                >
                  {plan.featured && (
                    <Chip
                      label="Le plus choisi"
                      color="primary"
                      size="small"
                      sx={{
                        position: "absolute",
                        top: -14,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontWeight: 700,
                      }}
                    />
                  )}
                  <Typography variant="h6" fontWeight={700}>
                    {plan.name}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: 13.5, mb: 2, minHeight: 34 }}
                  >
                    {plan.for}
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="baseline"
                    spacing={0.5}
                    sx={{ mb: 3 }}
                  >
                    <Typography variant="h4" fontWeight={800}>
                      {(billingCycle === "annual"
                        ? plan.annualPrice
                        : plan.monthlyPrice
                      ).toLocaleString("fr-FR")}
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: 13.5 }}>
                      {billingCycle === "annual" ? "FCFA / an" : "FCFA / mois"}
                    </Typography>
                  </Stack>
                  {billingCycle === "annual" && plan.annualDiscount > 0 && (
                    <Typography
                      color="success.main"
                      variant="body2"
                      sx={{ mt: -2, mb: 2, fontWeight: 700 }}
                    >
                      Économisez {plan.annualDiscount}%
                    </Typography>
                  )}
                  <Button
                    component={RouterLink}
                    to={`/create-school?plan=${plan.id}`}
                    variant={plan.featured ? "contained" : "outlined"}
                    size="large"
                    fullWidth
                    sx={{ mb: 3 }}
                  >
                    Créer mon école
                  </Button>
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      color: "text.secondary",
                      mb: 1.5,
                    }}
                  >
                    {plan.id === "ecole" ? "Inclus" : "Tout École, plus"}
                  </Typography>
                  <Stack spacing={1.2} sx={{ flexGrow: 1 }}>
                    {plan.features.map((feature) => (
                      <Stack
                        key={feature}
                        direction="row"
                        spacing={1.2}
                        alignItems="flex-start"
                      >
                        <CheckCircleIcon
                          sx={{
                            fontSize: 18,
                            color: "success.main",
                            mt: 0.2,
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {feature}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            ))
          )}
        </Grid>

        <Paper variant="outlined" sx={{ mt: 5, p: 3.5 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Inclus dans tous les paliers
          </Typography>
          <Grid container spacing={1.5}>
            {INCLUDED_EVERYWHERE.map((item) => (
              <Grid key={item} size={{ xs: 12, sm: 6 }}>
                <Stack direction="row" spacing={1.2} alignItems="flex-start">
                  <CheckCircleIcon
                    sx={{
                      fontSize: 18,
                      color: "success.main",
                      mt: 0.2,
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {item}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Paper>

        <Box sx={{ mt: 7 }}>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ textAlign: "center", mb: 3 }}
          >
            Questions fréquentes
          </Typography>
          <Grid container spacing={2}>
            {FAQ.map((item) => (
              <Grid key={item.q} size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 2.5 }}>
                  <Typography fontWeight={700} sx={{ mb: 0.5, fontSize: 14.5 }}>
                    {item.q}
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 13.5 }}>
                    {item.a}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Paper
          elevation={0}
          sx={(theme) => ({
            mt: 7,
            p: { xs: 4, md: 5 },
            textAlign: "center",
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, transparent)`,
          })}
        >
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            Prêt à moderniser votre établissement ?
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Lancez votre espace en quelques minutes avec 30 jours d'essai
            gratuit.
          </Typography>
          <Button
            component={RouterLink}
            to="/create-school"
            variant="contained"
            size="large"
          >
            Créer mon école
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
