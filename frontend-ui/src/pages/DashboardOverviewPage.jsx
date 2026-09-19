import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSchools } from "../hooks/useSchools.js";

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { schoolUsers, loading } = useSchools();

  const current = schoolUsers.find(
    (su) => su.school?.id === user.current_school_id,
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
    parent: "/dashboard/my-children-payments",
    eleve: "/dashboard/my-bulletin",
  };

  if (loading || !current) {
    return null;
  }

  const redirectTarget = roleDashboardRedirect[roleSlug];

  if (redirectTarget && redirectTarget !== location.pathname) {
    return <Navigate to={redirectTarget} replace />;
  }

  return null;
}
