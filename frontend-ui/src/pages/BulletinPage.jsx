import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function BulletinPage() {
  const { user } = useAuth();
  const { studentId } = useParams();
  const [bulletin, setBulletin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/schools/${user.current_school_id}/students/${studentId}/bulletin`)
      .then((r) => setBulletin(r.data))
      .catch(() => setError("Impossible de charger le bulletin."))
      .finally(() => setLoading(false));
  }, [user.current_school_id, studentId]);

  if (loading) return <p>Chargement...</p>;

  return (
    <Box>
      <Button component={RouterLink} to="/dashboard/students" sx={{ mb: 2 }}>
        ← Retour aux élèves
      </Button>

      {error && <Typography color="error">{error}</Typography>}

      {bulletin && (
        <>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" fontWeight={700}>
              Bulletin — {bulletin.student.fullname}
            </Typography>
            <Chip
              label={`Moyenne générale : ${bulletin.overall_average ?? '—'}`}
              color="primary"
              sx={{ fontWeight: 700, fontSize: '1rem', py: 2.5 }}
            />
          </Stack>

          <Card variant="outlined">
            <CardContent sx={{ p: 0 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Matière</TableCell>
                    <TableCell>Professeur</TableCell>
                    <TableCell align="center">Notes saisies</TableCell>
                    <TableCell align="right">Moyenne</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bulletin.subjects.map((s) => (
                    <TableRow key={s.subject}>
                      <TableCell>{s.subject}</TableCell>
                      <TableCell>{s.teacher}</TableCell>
                      <TableCell align="center">{s.grades_count}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700}>{s.average ?? '—'}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bulletin.subjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        Aucune matière enseignée pour l'instant.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
