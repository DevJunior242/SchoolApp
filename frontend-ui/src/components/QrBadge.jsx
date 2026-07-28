import { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Badge imprimable pour la cantine (réutilisable plus tard pour d'autres
 * pointages) : le QR encode directement l'id de l'élève, déjà la clé
 * unique utilisée partout côté API — pas de code séparé à générer/stocker.
 * Partagé entre la vue staff, la vue parent (par enfant) et l'auto-service
 * élève majeur.
 */
export default function QrBadge({ studentId, fullname }) {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, studentId, { width: 220, margin: 1 }, (err) => {
      if (err) setError('Impossible de générer le QR code.');
    });
  }, [studentId]);

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto' }}>
      <Paper id="qr-badge-print" variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="overline" color="text.secondary">
          {user.current_school?.name}
        </Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          {fullname}
        </Typography>
        {error && <Typography color="error">{error}</Typography>}
        <canvas ref={canvasRef} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Carte élève — cantine
        </Typography>
      </Paper>

      <Button startIcon={<PrintIcon />} variant="contained" onClick={() => window.print()} sx={{ mt: 2 }} fullWidth>
        Imprimer
      </Button>
    </Box>
  );
}
