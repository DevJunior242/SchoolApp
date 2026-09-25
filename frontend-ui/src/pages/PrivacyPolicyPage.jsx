import { Box, Button, Container, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

const PRIVACY_PDF_URL = `/${encodeURIComponent(
  "Politique de Confidentialité et de Protection des Données — IntellIno Édu.pdf",
)}`;

export default function PrivacyPolicyPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Politique de confidentialité
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Version 1.0 — mise à jour le 7 septembre 2026
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: { xs: "stretch", sm: "flex-end" },
          flexDirection: { xs: "column", sm: "row" },
          mb: 2,
        }}
      >
        <Button
          component="a"
          href={PRIVACY_PDF_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="contained"
          sx={{ display: { xs: "inline-flex", md: "none" } }}
        >
          Ouvrir le document
        </Button>
        <Button
          component="a"
          href={PRIVACY_PDF_URL}
          download
          variant="outlined"
          startIcon={<DownloadIcon />}
        >
          Télécharger la politique
        </Button>
      </Box>

      <Box
        component="iframe"
        src={PRIVACY_PDF_URL}
        title="Politique de confidentialité et de protection des données IntellIno Édu"
        sx={{
          display: { xs: "none", md: "block" },
          width: "100%",
          height: "900px",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      />
    </Container>
  );
}
