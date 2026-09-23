import { Alert, Box, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import BulletinPage from "./BulletinPage.jsx";

/**
 * Résout l'identifiant de l'élève connecté puis affiche le bulletin dans sa
 * route principale, sans détour par une URL de gestion réservée au staff.
 */
export default function StudentSelfBulletinPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const {
    data: student,
    loading,
    error,
  } = useApiGet(schoolId ? `/schools/${schoolId}/my-student-profile` : null);

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {error}
      </Alert>
    );
  }

  if (student?.id) {
    return <BulletinPage studentId={student.id} />;
  }

  return (
    <Typography color="text.secondary">
      {loading ? "Chargement..." : "Profil élève introuvable."}
    </Typography>
  );
}
