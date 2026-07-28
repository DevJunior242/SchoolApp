import { useState } from 'react';
import { Alert, Box, Tab, Tabs, Typography } from '@mui/material';
import LibrarySummaryPanel from '../components/LibrarySummaryPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

export default function ParentLibraryPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data, loading, error } = useApiGet(schoolId ? `/schools/${schoolId}/my-children-library` : null);

  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [initializedFor, setInitializedFor] = useState(null);

  // Ajustement pendant le rendu : sélectionne le premier enfant une fois la
  // liste chargée, sans écraser un choix déjà fait par l'utilisateur.
  if (data?.length > 0 && initializedFor !== schoolId) {
    setSelectedStudentId(data[0]?.student?.id);
    setInitializedFor(schoolId);
  }

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

  const selected = children.find((c) => c.student?.id === selectedStudentId);

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Bibliothèque
      </Typography>

      {children.length > 1 && (
        <Tabs
          value={selectedStudentId}
          onChange={(_, v) => setSelectedStudentId(v)}
          sx={{ mb: 2 }}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          {children.map((c) => (
            <Tab key={c.student?.id} value={c.student?.id} label={c.student?.fullname} />
          ))}
        </Tabs>
      )}

      {selected && <LibrarySummaryPanel schoolId={schoolId} summary={selected} />}
    </Box>
  );
}
