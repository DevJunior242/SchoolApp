import { Box, Button, Typography } from '@mui/material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WalletPanel from '../components/WalletPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function StudentWalletPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const fullname = location.state?.fullname ?? 'cet élève';

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Retour
      </Button>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Portefeuille cantine
      </Typography>
      <WalletPanel schoolId={schoolId} student={{ id: studentId, fullname }} />
    </Box>
  );
}
