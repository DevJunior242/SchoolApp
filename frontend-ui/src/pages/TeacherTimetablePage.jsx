import {
  Alert,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
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

  // Une ligne par créneau horaire distinct, pour aligner visuellement les
  // cours qui ont lieu au même moment sur des jours différents.
  const timeRanges = [...new Set(slots.map((s) => `${s.start_time}-${s.end_time}`))]
    .sort()
    .map((range) => {
      const [start_time, end_time] = range.split('-');
      return { start_time, end_time };
    });

  function slotAt(day, start_time, end_time) {
    return slots.find(
      (s) => s.day_of_week === day && s.start_time === start_time && s.end_time === end_time
    );
  }

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

      {timeRanges.length === 0 ? (
        <Typography color="text.secondary">Aucun cours planifié pour l'instant.</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Horaire</TableCell>
                {DAYS.map((day) => (
                  <TableCell key={day.value} align="center" sx={{ fontWeight: 700 }}>
                    {day.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {timeRanges.map((range) => (
                <TableRow key={`${range.start_time}-${range.end_time}`}>
                  <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                    {range.start_time.slice(0, 5)}–{range.end_time.slice(0, 5)}
                  </TableCell>
                  {DAYS.map((day) => {
                    const slot = slotAt(day.value, range.start_time, range.end_time);
                    return (
                      <TableCell key={day.value} align="center" sx={{ minWidth: 130 }}>
                        {slot ? (
                          <Box
                            sx={(theme) => ({
                              p: 1,
                              borderRadius: 1,
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                            })}
                          >
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {slot.class_subject_teacher?.subject?.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                              {slot.class_subject_teacher?.school_class?.name}
                              {slot.room ? ` · ${slot.room}` : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
