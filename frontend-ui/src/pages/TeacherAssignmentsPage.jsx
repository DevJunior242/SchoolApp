import { Alert, Button, Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material';
import { motion } from 'motion/react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data, loading, error } = useApiGet(schoolId ? `/schools/${schoolId}/my-assignments` : null);
  const assignments = data ?? [];
  // Classes dont il est titulaire : il y écrit l'appréciation générale.
  const { data: headClassesData } = useApiGet(schoolId ? `/schools/${schoolId}/my-head-classes` : null);
  const headClasses = Array.isArray(headClassesData) ? headClassesData : [];

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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {headClasses.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Classes dont vous êtes titulaire
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {headClasses.map((headClass) => (
                <Button
                  key={headClass.id}
                  size="small"
                  variant="contained"
                  component={RouterLink}
                  to={`/dashboard/head-classes/${headClass.id}/appreciations`}
                >
                  Appréciations générales · {headClass.name}
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        {assignments.map((a, i) => (
          <Grid key={a.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.05 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1">{a.subject?.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {a.school_class?.name} · {a.school_class?.level?.name}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button size="small" variant="outlined" component={RouterLink} to={`/dashboard/assignments/${a.id}/grades`}>
                      Notes
                    </Button>
                    <Button size="small" variant="outlined" component={RouterLink} to={`/dashboard/assignments/${a.id}/attendances`}>
                      Absences
                    </Button>
                    <Button size="small" variant="outlined" component={RouterLink} to={`/dashboard/assignments/${a.id}/course-contents`}>
                      Contenu
                    </Button>
                    <Button size="small" variant="outlined" component={RouterLink} to={`/dashboard/assignments/${a.id}/appreciations`}>
                      Appréciations
                    </Button>
                  </Stack>
                </CardContent>
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
