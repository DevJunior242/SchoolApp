import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Tab, Tabs, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CourseContentList from '../components/CourseContentList.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

export default function ParentCoursesPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data, loading, error } = useApiGet(schoolId ? `/schools/${schoolId}/my-children-courses` : null);

  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [initializedFor, setInitializedFor] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  // Ajustement pendant le rendu : sélectionne le premier enfant une fois la
  // liste chargée, sans écraser un choix déjà fait par l'utilisateur.
  if (data?.length > 0 && initializedFor !== schoolId) {
    setSelectedStudentId(data[0]?.student?.id);
    setInitializedFor(schoolId);
  }

  const { data: contents, loading: contentsLoading, reload } = useApiGet(
    selectedSubjectId ? `/assignments/${selectedSubjectId}/course-contents` : null
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

  const children = data ?? [];

  if (children.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucun enfant rattaché à votre compte dans cette école.</Typography>
      </Box>
    );
  }

  const selectedChild = children.find((c) => c.student?.id === selectedStudentId);
  const subjects = selectedChild?.subjects ?? [];
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  if (selectedSubject) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => setSelectedSubjectId(null)} sx={{ mb: 2 }}>
          Retour
        </Button>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {selectedSubject.subject?.name}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {selectedSubject.teacher?.fullname}
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
        Cours
      </Typography>

      {children.length > 1 && (
        <Tabs
          value={selectedStudentId}
          onChange={(_, v) => {
            setSelectedStudentId(v);
            setSelectedSubjectId(null);
          }}
          sx={{ mb: 2 }}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          {children.map((c) => (
            <Tab key={c.student?.id} value={c.student?.id} label={c.student?.fullname} />
          ))}
        </Tabs>
      )}

      <Stack spacing={1.5}>
        {subjects.map((subject) => (
          <Card key={subject.id} variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => setSelectedSubjectId(subject.id)}>
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
        {subjects.length === 0 && <Typography color="text.secondary">Aucun cours pour l'instant.</Typography>}
      </Stack>
    </Box>
  );
}
