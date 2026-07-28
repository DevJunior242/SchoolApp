import { Alert, Box, Card, CardContent, Chip, Stack, Typography, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../api/axios.jsx';

const RESERVATION_STATUS_LABELS = {
  1: { label: 'En attente', color: 'default' },
  2: { label: 'Prête à retirer', color: 'success' },
};

/**
 * Emprunts en cours, réservations et documents numériques disponibles pour
 * un élève donné — partagé entre la vue élève (compte propre) et la vue
 * parent (par enfant), qui reçoivent la même forme de résumé côté API.
 */
export default function LibrarySummaryPanel({ schoolId, summary }) {
  async function handleDownload(doc) {
    const response = await api.get(`/schools/${schoolId}/library/documents/${doc.id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Emprunts en cours
        </Typography>
        <Stack spacing={1}>
          {summary?.active_loans?.map((loan) => {
            const overdue = loan.due_at?.slice(0, 10) < today;
            return (
              <Card key={loan.id} variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {loan.copy?.book?.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      À rendre le {new Date(loan.due_at).toLocaleDateString('fr-FR')}
                    </Typography>
                  </Box>
                  {overdue && <Chip label="En retard" color="error" size="small" />}
                </CardContent>
              </Card>
            );
          })}
          {(summary?.active_loans?.length ?? 0) === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucun emprunt en cours.
            </Typography>
          )}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Réservations
        </Typography>
        <Stack spacing={1}>
          {summary?.reservations?.map((reservation) => (
            <Card key={reservation.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={600} sx={{ flexGrow: 1 }}>
                  {reservation.book?.title}
                </Typography>
                <Chip
                  size="small"
                  label={RESERVATION_STATUS_LABELS[reservation.status]?.label ?? reservation.status}
                  color={RESERVATION_STATUS_LABELS[reservation.status]?.color ?? 'default'}
                />
              </CardContent>
            </Card>
          ))}
          {(summary?.reservations?.length ?? 0) === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucune réservation.
            </Typography>
          )}
        </Stack>
        {summary?.reservations?.some((r) => r.status === 2) && (
          <Alert severity="success" sx={{ mt: 1 }}>
            Un livre réservé est prêt à retirer à la bibliothèque.
          </Alert>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Bibliothèque numérique
        </Typography>
        <Stack spacing={1}>
          {summary?.documents?.map((doc) => (
            <Card key={doc.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={600} sx={{ flexGrow: 1 }}>
                  {doc.title}
                </Typography>
                <Button size="small" startIcon={<DownloadIcon />} onClick={() => handleDownload(doc)}>
                  Télécharger
                </Button>
              </CardContent>
            </Card>
          ))}
          {(summary?.documents?.length ?? 0) === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucun document disponible.
            </Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
