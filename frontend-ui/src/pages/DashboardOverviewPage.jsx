import { Link as RouterLink, Navigate, useLocation } from "react-router-dom";
import { Box, Button, Card, CardContent, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext.jsx";
import { useSchools } from "../hooks/useSchools.js";

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { schoolUsers, loading } = useSchools();

  // Rôles globaux, sans école : leur « vue d'ensemble » est leur première page.
  // Avant, /dashboard renvoyait `null` pour eux : page blanche, sans erreur
  // (donc invisible pour AppErrorBoundary).
  const globalRole = user?.role?.slug;
  if (globalRole === "superadmin") return <Navigate to="/dashboard/all-schools" replace />;
  if (globalRole === "prestataire") return <Navigate to="/dashboard/my-marketplace-items" replace />;

  const current = schoolUsers.find(
    (su) => su.school?.id === user?.current_school_id,
  );
  const roleSlug = current?.role?.slug;

  const roleDashboardRedirect = {
    admin: "/dashboard/admin",
    comptable: "/dashboard/comptable",
    censeur: "/dashboard/attendance-justifications",
    surveillant: "/dashboard/attendance-justifications",
    secretaire: "/dashboard/students",
    rh: "/dashboard/hr",
    infirmier: "/dashboard/health",
    bibliothecaire: "/dashboard/library",
    chauffeur: "/dashboard/my-bus-trip",
    cantine: "/dashboard/cafeteria",
    professeur: "/dashboard/my-assignments",
    enseignant: "/dashboard/my-assignments",
    parent: "/dashboard/parent",
    eleve: "/dashboard/student",
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Aucune école en cours (aucune école, ou école en cours introuvable).
  if (!current) {
    return (
      <Overview
        title="Choisissez une école"
        text={
          schoolUsers.length
            ? "Aucune école n’est sélectionnée pour votre compte. Choisissez celle sur laquelle vous voulez travailler."
            : "Votre compte n’est rattaché à aucune école pour l’instant. Créez votre école ou demandez à son administrateur de vous ajouter."
        }
        to={schoolUsers.length ? "/dashboard/schools" : "/create-school"}
        button={schoolUsers.length ? "Voir mes écoles" : "Créer une école"}
      />
    );
  }

  const redirectTarget = roleDashboardRedirect[roleSlug];

  if (redirectTarget && redirectTarget !== location.pathname) {
    return <Navigate to={redirectTarget} replace />;
  }

  // Rôle sans tableau de bord dédié : un accueil plutôt qu'une page blanche.
  return (
    <Overview
      title={`Bienvenue${user?.fullname ? `, ${String(user.fullname).split(" ")[0]}` : ""}`}
      text={`Vous êtes connecté à ${current.school?.name || "votre école"}. Utilisez le menu pour accéder à vos pages.`}
    />
  );
}

function Overview({ title, text, to, button }) {
  return (
    <Box sx={{ maxWidth: 560, mx: "auto", mt: 6 }}>
      <Card variant="outlined">
        <CardContent sx={{ textAlign: "center", p: 4 }}>
          <Typography variant="h5" gutterBottom>
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: to ? 3 : 0 }}>
            {text}
          </Typography>
          {to && (
            <Button variant="contained" component={RouterLink} to={to}>
              {button}
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
