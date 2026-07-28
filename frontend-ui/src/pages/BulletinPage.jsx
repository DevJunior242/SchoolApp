import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

const BULLETIN_TYPE_LABELS = {
  trimestre: 'Bulletin trimestriel',
  semestre: 'Bulletin semestriel',
  annuel: 'Bulletin annuel',
};

export default function BulletinPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { studentId } = useParams();
  const { data: seasons } = useApiGet(user.current_school_id ? `/schools/${user.current_school_id}/seasons` : null);
  const [seasonId, setSeasonId] = useState('');
  const [bulletin, setBulletin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await api.get(`/schools/${user.current_school_id}/students/${studentId}/bulletin`, {
          params: seasonId ? { season_id: seasonId } : {},
        });
        setBulletin(response.data);
      } catch {
        setError("Impossible de charger le bulletin.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user.current_school_id, studentId, seasonId]);

  // Le titre du document sert de nom de fichier suggéré par le navigateur
  // lors de l'export PDF : on veut que le type de bulletin y apparaisse
  // clairement (trimestriel/semestriel/annuel), pas juste "EduAfrique".
  useEffect(() => {
    if (!bulletin) return;
    const previousTitle = document.title;
    document.title = `Bulletin - ${bulletin.student.fullname} - ${bulletin.period_label}`;
    return () => {
      document.title = previousTitle;
    };
  }, [bulletin]);

  if (loading) return <p>Chargement...</p>;

  return (
    <Box>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ← Retour
      </Button>

      {error && <Typography color="error">{error}</Typography>}

      {bulletin && (
        <>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" fontWeight={700}>
              Bulletin — {bulletin.student.fullname}
            </Typography>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => window.print()}>
              Télécharger (PDF)
            </Button>
          </Stack>

          <TextField
            select
            label="Période"
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            sx={{ mb: 3, maxWidth: 280 }}
            fullWidth
          >
            <MenuItem value="">Année complète</MenuItem>
            {(seasons ?? []).map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>

          <Box id="bulletin-print">
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {user.current_school?.name}
                </Typography>
                <Typography color="text.secondary">
                  {bulletin.student.fullname} — {bulletin.period_label}
                </Typography>
              </Box>
              <Chip
                label={`Moyenne générale : ${bulletin.overall_average ?? '—'}`}
                color="primary"
                sx={{ fontWeight: 700, fontSize: '1rem', py: 2.5 }}
              />
            </Stack>

            <Stack direction="row" sx={{ mb: 2, gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={BULLETIN_TYPE_LABELS[bulletin.bulletin_type] ?? bulletin.bulletin_type}
                variant="outlined"
                size="small"
              />
              {bulletin.mention && (
                <Chip
                  label={bulletin.mention}
                  color={bulletin.mention.startsWith('Admis') ? 'success' : 'error'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Stack>

            <Card variant="outlined">
              <CardContent sx={{ p: 0 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Matière</TableCell>
                      <TableCell>Professeur</TableCell>
                      <TableCell align="center">Coef.</TableCell>
                      <TableCell align="center">Notes saisies</TableCell>
                      <TableCell align="right">Moyenne</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bulletin.subjects.map((s) => (
                      <TableRow key={s.subject}>
                        <TableCell>{s.subject}</TableCell>
                        <TableCell>{s.teacher}</TableCell>
                        <TableCell align="center">{s.coefficient}</TableCell>
                        <TableCell align="center">{s.grades_count}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700}>{s.average ?? '—'}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {bulletin.subjects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          Aucune matière enseignée pour l'instant.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Box>
        </>
      )}
    </Box>
  );
}
