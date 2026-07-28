import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

export default function ParentBulletinsPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data: children, loading, error } = useApiGet(schoolId ? `/schools/${schoolId}/my-children` : null);

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
        Bulletins de mes enfants
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {(children ?? []).map((child) => (
          <Card key={child.id} variant="outlined">
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2">{child.fullname}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {child.class_students?.[0]?.school_class?.name ?? 'Classe non renseignée'}
                </Typography>
              </Box>
              <Button component={RouterLink} to={`/dashboard/students/${child.id}/bulletin`} variant="outlined" size="small">
                Voir le bulletin
              </Button>
            </CardContent>
          </Card>
        ))}
        {(!children || children.length === 0) && (
          <Typography color="text.secondary">Aucun enfant rattaché à votre compte dans cette école.</Typography>
        )}
      </Stack>
    </Box>
  );
}
