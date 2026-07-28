import { useState } from 'react';
import { Alert, Avatar, Box, Card, CardContent, Chip, Divider, MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

const CATEGORIES = [
  { value: '', label: 'Toutes les catégories' },
  { value: 1, label: 'Enseignant' },
  { value: 2, label: 'Formateur' },
  { value: 3, label: 'Chauffeur' },
  { value: 4, label: 'Fournisseur' },
  { value: 5, label: 'Imprimeur' },
  { value: 6, label: 'Librairie' },
];

export default function DashboardMarketplacePage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;

  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);

  const { data, loading, error } = useApiGet(schoolId ? `/schools/${schoolId}/marketplace/providers` : null, {
    params: { category: category || undefined, city: city || undefined, page },
  });

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  const providers = data?.data ?? [];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Marketplace
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Enseignants, formateurs, chauffeurs, fournisseurs, imprimeurs, librairies vérifiés par la plateforme.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          label="Catégorie"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 220 }}
        >
          {CATEGORIES.map((c) => (
            <MenuItem key={c.value} value={c.value}>
              {c.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Ville"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPage(1);
          }}
          fullWidth
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5}>
          {providers.map((p) => (
            <Card key={p.id} variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                    {p.business_name}
                  </Typography>
                  <Chip label={CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category} size="small" />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {p.city ? `${p.city} · ` : ''}
                  {p.phone}
                  {p.phone && p.email ? ' · ' : ''}
                  {p.email}
                </Typography>
                {p.description && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {p.description}
                  </Typography>
                )}
                {p.items?.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Articles
                    </Typography>
                    <Stack spacing={1}>
                      {p.items.map((item) => (
                        <Stack key={item.id} direction="row" alignItems="center" spacing={1.5}>
                          <Avatar src={item.image_url ?? undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
                            {item.name?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {item.name}
                          </Typography>
                          {item.price !== null && (
                            <Typography variant="body2" color="text.secondary">
                              {Number(item.price).toLocaleString()}
                            </Typography>
                          )}
                        </Stack>
                      ))}
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          {providers.length === 0 && (
            <Typography color="text.secondary">Aucun prestataire trouvé pour ces critères.</Typography>
          )}
        </Stack>
      )}

      {data?.last_page > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination count={data.last_page} page={page} onChange={(_, p) => setPage(p)} />
        </Stack>
      )}
    </Box>
  );
}
