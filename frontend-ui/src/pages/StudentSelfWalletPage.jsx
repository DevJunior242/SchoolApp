import { Alert, Box, Typography } from '@mui/material';
import WalletPanel from '../components/WalletPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

export default function StudentSelfWalletPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data: student, loading, error } = useApiGet(schoolId ? `/schools/${schoolId}/my-student-profile` : null);

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (loading) return <Typography color="text.secondary">Chargement...</Typography>;

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {error}
      </Alert>
    );
  }

  if (!student) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Fiche élève introuvable.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Ma cantine
      </Typography>
      <WalletPanel schoolId={schoolId} student={student} />
    </Box>
  );
}
