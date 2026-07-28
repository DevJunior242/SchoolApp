import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrBadge from '../components/QrBadge.jsx';

export default function StudentQrBadgePage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fullname = location.state?.fullname ?? 'Élève';

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2, mx: 'auto', display: 'flex', maxWidth: 420 }}>
        Retour
      </Button>
      <QrBadge studentId={studentId} fullname={fullname} />
    </Box>
  );
}
