import { useState } from 'react';
import { Alert, Box, Tab, Tabs, Typography } from '@mui/material';
import QrBadge from '../components/QrBadge.jsx';
import WalletPanel from '../components/WalletPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

export default function ParentCafeteriaPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const { data: children, loading, error } = useApiGet(schoolId ? `/schools/${schoolId}/my-children` : null);

  const [selectedChildId, setSelectedChildId] = useState(null);
  const [initializedFor, setInitializedFor] = useState(null);
  const [section, setSection] = useState('wallet');

  // Ajustement pendant le rendu : sélectionne le premier enfant une fois
  // la liste chargée, sans écraser un choix déjà fait par l'utilisateur.
  if (children?.length > 0 && initializedFor !== schoolId) {
    setSelectedChildId(children[0].id);
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

  if ((children ?? []).length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">Aucun enfant rattaché à votre compte dans cette école.</Typography>
      </Box>
    );
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Cantine
      </Typography>

      {children.length > 1 && (
        <Tabs
          value={selectedChildId}
          onChange={(_, value) => setSelectedChildId(value)}
          sx={{ mb: 1 }}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          {children.map((child) => (
            <Tab key={child.id} value={child.id} label={child.fullname} />
          ))}
        </Tabs>
      )}

      <Tabs value={section} onChange={(_, v) => setSection(v)} sx={{ mb: 3 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab value="wallet" label="Portefeuille" />
        <Tab value="badge" label="Badge" />
      </Tabs>

      {selectedChild && section === 'wallet' && <WalletPanel schoolId={schoolId} student={selectedChild} />}
      {selectedChild && section === 'badge' && <QrBadge studentId={selectedChild.id} fullname={selectedChild.fullname} />}
    </Box>
  );
}
