import { useEffect, useState } from "react";
import { Alert, Box, Button, Container, Stack, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { LEGAL_PUBLISHED, LEGAL_UPDATED, LEGAL_VERSION } from "../legal/content.js";
import { downloadLegalPdf } from "../utils/legalPdf.js";

/**
 * CGU / politique de confidentialité en texte (remplace les anciens PDF) :
 * lisible sur téléphone, et « Télécharger (PDF) » génère un PDF à partir du
 * même contenu (jsPDF, chargé au clic) : toujours à jour, sans fichier à maintenir.
 */
export default function LegalDocument({ content, filename }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const meta = `Version ${LEGAL_VERSION} du ${LEGAL_PUBLISHED} — mise à jour le ${LEGAL_UPDATED}`;

  async function download() {
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadLegalPdf({ brand: "IntellIno Édu", content, meta, filename });
    } catch {
      setDownloadError("Le téléchargement a échoué. Vérifiez votre connexion puis réessayez.");
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    document.title = `${content.title} — IntellIno Édu`;
  }, [content.title]);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" }, mb: 3 }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            {content.title}
          </Typography>
          <Typography color="text.secondary">
            IntellIno Édu · {meta}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={download}
          disabled={downloading}
          sx={{ flexShrink: 0 }}
        >
          {downloading ? "Préparation..." : "Télécharger (PDF)"}
        </Button>
      </Stack>
      {downloadError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setDownloadError("")}>
          {downloadError}
        </Alert>
      )}

      {content.sections.map((section) => (
        <Box component="section" key={section.title} sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1.5, fontWeight: 700 }}>
            {section.title}
          </Typography>
          {section.blocks.map((block, index) => {
            if (Array.isArray(block)) {
              return (
                <Box component="ul" key={index} sx={{ pl: 3, my: 1.5, "& li": { mb: 0.75 } }}>
                  {block.map((item) => (
                    <Typography component="li" key={item} color="text.secondary">
                      {item}
                    </Typography>
                  ))}
                </Box>
              );
            }
            if (block && typeof block === "object") {
              return (
                <Typography key={index} variant="subtitle1" component="h3" sx={{ mt: 2, mb: 1, fontWeight: 700 }}>
                  {block.subtitle}
                </Typography>
              );
            }
            return (
              <Typography key={index} color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.7 }}>
                {block}
              </Typography>
            );
          })}
        </Box>
      ))}
    </Container>
  );
}
