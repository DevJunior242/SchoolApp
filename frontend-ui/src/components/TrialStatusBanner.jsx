import { Alert } from "@mui/material";

const STATUS_READ_ONLY = 2;

// Affiché uniquement au directeur : lui seul peut agir (contacter l'équipe,
// payer) sur l'état d'essai de son école.
export default function TrialStatusBanner({ school, role }) {
  if (!school || role !== "directeur") return null;

  if (school.status === STATUS_READ_ONLY) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        La période d'essai de votre école est terminée. Vos données restent consultables, mais vous
        ne pouvez plus rien ajouter ni modifier. Contactez-nous pour réactiver l'accès complet.
      </Alert>
    );
  }

  if (school.trial_ends_at) {
    const daysLeft = Math.ceil((new Date(school.trial_ends_at) - new Date()) / 86400000);
    if (daysLeft >= 0) {
      const urgent = daysLeft <= 7;
      return (
        <Alert severity={urgent ? "warning" : "info"} sx={{ mb: 3 }}>
          Il vous reste{" "}
          {daysLeft === 0 ? "moins d'un jour" : `${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}{" "}
          d'essai gratuit.
          {urgent && " Contactez-nous pour continuer à utiliser votre espace sans interruption."}
        </Alert>
      );
    }
  }

  return null;
}
