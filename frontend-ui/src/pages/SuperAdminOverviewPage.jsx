import { Alert, Box, Card, CardContent, Grid, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Navigate } from 'react-router-dom';
import ApartmentIcon from '@mui/icons-material/Apartment';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import GroupsIcon from '@mui/icons-material/Groups';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

export default function SuperAdminOverviewPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.slug === 'superadmin';
  const { data: stats, loading, error } = useApiGet('/admin/stats', { enabled: isSuperAdmin });

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) return <Typography color="text.secondary">Chargement...</Typography>;

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {error}
      </Alert>
    );
  }

  const tiles = [
    {
      icon: <ApartmentIcon color="primary" />,
      label: 'Écoles',
      value: stats.schools_count,
    },
    {
      icon: <ToggleOnIcon color="primary" />,
      label: 'Écoles actives',
      value: stats.schools_active_count,
    },
    {
      icon: <GroupsIcon color="primary" />,
      label: 'Utilisateurs',
      value: stats.users_count,
    },
    {
      icon: <HowToRegIcon color="primary" />,
      label: "Demandes d'inscription en attente",
      value: stats.enrollment_requests_pending_count,
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Administration de la plateforme
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Vue d'ensemble d'EduAfrique, toutes écoles confondues.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {tiles.map((tile) => (
          <Grid key={tile.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ mb: 1 }}>{tile.icon}</Box>
                <Typography variant="h4" fontWeight={700}>
                  {tile.value}
                </Typography>
                <Typography color="text.secondary">{tile.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <VpnKeyIcon color="primary" />
            <Typography variant="h6">Clés d'activation</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 4 }}>
              <Box
                sx={(theme) => ({
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.success.main, 0.08),
                })}
              >
                <Typography variant="h5" color="success.main" fontWeight={700}>
                  {stats.activation_keys.disponible}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Disponibles
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Box
                sx={(theme) => ({
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                })}
              >
                <Typography variant="h5" fontWeight={700}>
                  {stats.activation_keys.utilisee}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Utilisées
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Box
                sx={(theme) => ({
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                })}
              >
                <Typography variant="h5" color="error.main" fontWeight={700}>
                  {stats.activation_keys.revoquee}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Révoquées
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
