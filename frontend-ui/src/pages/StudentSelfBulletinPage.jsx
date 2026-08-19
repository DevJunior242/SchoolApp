import { useEffect } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

/**
 * Redirige vers la page bulletin générique (BulletinPage, réutilisée telle
 * quelle par le staff et les parents) une fois l'identifiant de l'élève
 * connu — cette page-ci existe juste pour résoudre "mon propre élève" avant
 * de rejoindre l'URL /students/:studentId/bulletin habituelle.
 */
export default function StudentSelfBulletinPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const schoolId = user.current_school_id;
  const { data: student, loading, error } = useApiGet(schoolId ? `/schools/${schoolId}/my-student-profile` : null);

  useEffect(() => {
    if (student) {
      navigate(`/dashboard/students/${student.id}/bulletin`, { replace: true });
    }
  }, [student, navigate]);

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
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

  return <Typography color="text.secondary">{loading ? 'Chargement...' : 'Redirection...'}</Typography>;
}
