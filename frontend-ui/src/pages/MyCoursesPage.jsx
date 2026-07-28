import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CourseContentList from '../components/CourseContentList.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

export default function MyCoursesPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data: subjects, loading, error } = useApiGet(schoolId ? `/schools/${schoolId}/my-courses` : null);

  const [selectedId, setSelectedId] = useState(null);
  const { data: contents, loading: contentsLoading, reload } = useApiGet(
    selectedId ? `/assignments/${selectedId}/course-contents` : null
  );

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (loading) return <Typography color="text.secondary">Chargement...</Typography>;
  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {error}
      </Alert>
    );
  }

  const list = subjects ?? [];
  const selected = list.find((s) => s.id === selectedId);

  if (selected) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => setSelectedId(null)} sx={{ mb: 2 }}>
          Retour
        </Button>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {selected.subject?.name}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {selected.teacher?.fullname}
        </Typography>
        {contentsLoading ? (
          <Typography color="text.secondary">Chargement...</Typography>
        ) : (
          <CourseContentList contents={contents} onRefresh={reload} />
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Mes cours
      </Typography>

      <Stack spacing={1.5}>
        {list.map((subject) => (
          <Card key={subject.id} variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => setSelectedId(subject.id)}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1">{subject.subject?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {subject.teacher?.fullname}
                </Typography>
              </Box>
              <Chip label={`${subject.course_contents_count ?? 0} contenu(s)`} size="small" />
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <Typography color="text.secondary">Aucun cours pour l'instant.</Typography>}
      </Stack>
    </Box>
  );
}
