import { useEffect, useState } from 'react';
import { Box, Card, CardActionArea, CardContent, Container, Grid, Typography } from '@mui/material';
import { motion } from 'motion/react';
import { Link as RouterLink } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    api
      .get(`/schools/${schoolId}/my-assignments`)
      .then((r) => setAssignments(r.data))
      .finally(() => setLoading(false));
  }, [schoolId]);

  if (!schoolId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Container>
    );
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <Container maxWidth="lg">
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Mes cours
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Cliquez sur un cours pour saisir les notes de vos élèves.
      </Typography>

      <Grid container spacing={2}>
        {assignments.map((a, i) => (
          <Grid key={a.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.05 }}>
              <Card variant="outlined">
                <CardActionArea component={RouterLink} to={`/dashboard/assignments/${a.id}/grades`} sx={{ p: 1 }}>
                  <CardContent>
                    <Typography variant="subtitle1">{a.subject.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {a.school_class.name} · {a.school_class.level?.name}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </motion.div>
          </Grid>
        ))}
        {assignments.length === 0 && (
          <Grid size={12}>
            <Typography color="text.secondary">Aucun cours ne vous est encore assigné.</Typography>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
