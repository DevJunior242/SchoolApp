import { Box, Button, Container, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

const TERMS_PDF_URL = encodeURI('/Conditions Générales d’Utilisation — IntellIno Édu.pdf');

export default function TermsPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Conditions générales d'utilisation
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Version 1.0 — mise à jour le 7 septembre 2026
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          component="a"
          href={TERMS_PDF_URL}
          download
          variant="outlined"
          startIcon={<DownloadIcon />}
        >
          Télécharger les CGU
        </Button>
      </Box>

      <Box
        component="iframe"
        src={TERMS_PDF_URL}
        title="Conditions générales d'utilisation IntellIno Édu"
        sx={{
          display: 'block',
          width: '100%',
          height: { xs: '70vh', md: '900px' },
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      />

    </Container>
  );
}
