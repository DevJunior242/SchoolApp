import { Alert, Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

export default function TeacherTimetablePage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data, loading, error } = useApiGet(schoolId ? `/schools/${schoolId}/my-timetable` : null);
  const slots = data ?? [];

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Mon emploi du temps
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Tous vos cours, toutes classes confondues.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {DAYS.map((day) => (
          <Grid key={day.value} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {day.label}
            </Typography>
            <Stack spacing={1}>
              {slots
                .filter((s) => s.day_of_week === day.value)
                .map((slot, i) => (
                  <motion.div key={slot.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {slot.class_subject_teacher.subject.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          {slot.class_subject_teacher.school_class.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                          {slot.room ? ` · ${slot.room}` : ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              {slots.filter((s) => s.day_of_week === day.value).length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  —
                </Typography>
              )}
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
