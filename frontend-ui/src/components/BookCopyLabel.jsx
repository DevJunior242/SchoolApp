import { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import QRCode from 'qrcode';

/**
 * Étiquette imprimable à coller sur l'exemplaire physique : le QR encode
 * directement l'id de l'exemplaire (book_copy.id), même principe que le
 * badge élève — c'est ce QR que le personnel scanne ensuite pour
 * emprunter/retourner ce livre précis.
 */
export default function BookCopyLabel({ copyId, bookTitle, copyNumber }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, copyId, { width: 180, margin: 1 }, (err) => {
      if (err) setError('Impossible de générer le QR code.');
    });
  }, [copyId]);

  return (
    <Box>
      <Paper id="book-copy-label-print" variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
          {bookTitle}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Exemplaire {copyNumber}
        </Typography>
        {error && <Typography color="error">{error}</Typography>}
        <canvas ref={canvasRef} />
      </Paper>

      <Button startIcon={<PrintIcon />} variant="contained" onClick={() => window.print()} sx={{ mt: 2 }} fullWidth>
        Imprimer l'étiquette
      </Button>
    </Box>
  );
}
