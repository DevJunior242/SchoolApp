import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { motion } from 'motion/react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import api from '../api/axios.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

const STATUS_OPTIONS = [
  { value: 1, label: 'Présent' },
  { value: 0, label: 'Absent' },
  { value: 2, label: 'Retard' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceEntryPage() {
  const { assignmentId } = useParams();
  const { data: studentsData, loading, error: studentsError } = useApiGet(`/assignments/${assignmentId}/students`);
  const students = studentsData ?? [];
  const [date, setDate] = useState(todayISO());
  const [statuses, setStatuses] = useState({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadAttendance(forDate) {
    setLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const response = await api.get(`/assignments/${assignmentId}/attendances`, { params: { date: forDate } });
      const map = {};
      response.data.forEach((a) => {
        map[a.student_id] = a.status;
      });
      setStatuses(map);
    } catch (err) {
      setAttendanceError(err.response?.data?.message || 'Impossible de charger les présences de cette date.');
    } finally {
      setLoadingAttendance(false);
    }
  }

  useEffect(() => {
    if (!date) return;
    loadAttendance(date);
  }, [assignmentId, date]);

  function setStudentStatus(studentId, status) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const records = students.map((s) => ({
        student_id: s.student_id,
        status: statuses[s.student_id] ?? 1,
      }));
      await api.post(`/assignments/${assignmentId}/attendances`, { date, records });
      setSuccess('Présences enregistrées.');
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'enregistrer les présences.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <Box>
      <Button component={RouterLink} to="/dashboard/my-assignments" sx={{ mb: 2 }}>
        ← Retour à mes cours
      </Button>

      <Typography variant="h5" fontWeight={700} gutterBottom>
        Saisie des présences
      </Typography>

      {studentsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {studentsError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }}>
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ mb: 3 }}
          fullWidth
        />

        {attendanceError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {attendanceError}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {loadingAttendance ? (
          <p>Chargement...</p>
        ) : (
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {students.map((s, i) => (
              <motion.div key={s.student_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <Card variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                      {s.student.fullname}
                    </Typography>
                    <TextField
                      select
                      size="small"
                      value={statuses[s.student_id] ?? 1}
                      onChange={(e) => setStudentStatus(s.student_id, Number(e.target.value))}
                      sx={{ width: 160 }}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {students.length === 0 && <Typography color="text.secondary">Aucun élève inscrit dans cette classe.</Typography>}
          </Stack>
        )}

        <Button variant="contained" onClick={handleSubmit} disabled={submitting || students.length === 0} fullWidth>
          {submitting ? 'Enregistrement...' : 'Enregistrer les présences'}
        </Button>
      </Paper>
    </Box>
  );
}
