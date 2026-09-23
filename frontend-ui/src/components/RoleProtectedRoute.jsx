import { Button, Container, Paper, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSchools } from "../hooks/useSchools.js";

const ROLE_ROUTE_PREFIXES = {
  admin: [
    "admin",
    "schools",
    "members",
    "teachers",
    "classes",
    "students",
    "exams",
    "parents",
    "library",
    "attendance-justifications",
    "enrollment-requests",
    "school-year",
    "accounting",
    "payments",
    "expenses",
    "treasury",
    "cafeteria",
    "buses",
    "health",
    "ai-assistant",
    "hr",
    "settings",
  ],
  comptable: [
    "comptable",
    "accounting",
    "payments",
    "expenses",
    "treasury",
    "ai-assistant",
  ],
  censeur: ["attendance-justifications", "ai-assistant"],
  surveillant: ["attendance-justifications", "ai-assistant"],
  secretaire: ["students", "classes", "enrollment-requests"],
  rh: ["hr", "ai-assistant"],
  infirmier: ["health", "ai-assistant"],
  bibliothecaire: ["library", "my-library"],
  chauffeur: ["my-bus-trip"],
  cantine: ["cafeteria"],
  professeur: [
    "my-assignments",
    "my-timetable",
    "my-courses",
    "assignments",
    "ai-assistant",
  ],
  enseignant: [
    "my-assignments",
    "my-timetable",
    "my-courses",
    "assignments",
    "ai-assistant",
  ],
  parent: [
    "parent",
    "exams",
    "my-children-cafeteria",
    "my-children-bus",
    "my-children-library",
    "my-children-ai-assistant",
    "my-children-payments",
    "my-children-attendances",
    "my-children-bulletins",
    "my-children-courses",
  ],
  eleve: [
    "student",
    "exams",
    "my-badge",
    "my-wallet",
    "my-bus",
    "my-bulletin",
    "my-library",
    "my-courses",
  ],
};

const SHARED_SCHOOL_PREFIXES = ["events", "marketplace"];
const RESTRICTED_PREFIXES = Object.values(ROLE_ROUTE_PREFIXES)
  .flat()
  .filter((prefix) => !SHARED_SCHOOL_PREFIXES.includes(prefix));

function matchesPrefix(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function canViewBulletinDetail(path, roleSlug) {
  const isBulletinDetail = /^students\/[^/]+\/bulletin$/.test(path);
  return isBulletinDetail && (roleSlug === "eleve" || roleSlug === "parent");
}

function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h1" fontWeight={800} color="error.main">
          403
        </Typography>
        <Typography variant="h5" gutterBottom>
          Accès interdit
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Votre rôle ne vous autorise pas à consulter cette page.
        </Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Paper>
    </Container>
  );
}

export default function RoleProtectedRoute({ children }) {
  const { user } = useAuth();
  const { schoolUsers, loading } = useSchools();
  const location = useLocation();

  if (loading) {
    return null;
  }

  const globalRole = user?.role?.slug;
  if (globalRole === "superadmin" || globalRole === "prestataire") {
    return children;
  }

  const currentMembership = schoolUsers.find(
    (schoolUser) => schoolUser.school?.id === user?.current_school_id,
  );
  const roleSlug = currentMembership?.role?.slug;

  if (!roleSlug) {
    return children;
  }

  const dashboardPath = location.pathname.replace(/^\/dashboard\/?/, "");
  if (!dashboardPath) {
    return children;
  }

  if (
    SHARED_SCHOOL_PREFIXES.some((prefix) =>
      matchesPrefix(dashboardPath, prefix),
    )
  ) {
    return children;
  }

  if (canViewBulletinDetail(dashboardPath, roleSlug)) {
    return children;
  }

  const isRestrictedPath = RESTRICTED_PREFIXES.some((prefix) =>
    matchesPrefix(dashboardPath, prefix),
  );
  const canAccess = ROLE_ROUTE_PREFIXES[roleSlug]?.some((prefix) =>
    matchesPrefix(dashboardPath, prefix),
  );

  if (isRestrictedPath && !canAccess) {
    return <ForbiddenPage />;
  }

  return children;
}
