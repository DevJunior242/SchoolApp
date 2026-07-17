import { Alert, Box, Container, Typography } from '@mui/material';

export default function PrivacyPolicyPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Politique de confidentialité
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Dernière mise à jour : 16 juillet 2026 — version 1.0
      </Typography>

      <Alert severity="warning" sx={{ mb: 4 }}>
        Texte provisoire à titre indicatif. Il n'a pas été validé par un juriste et doit être revu au
        regard des lois de protection des données applicables dans chaque pays où EduAfrique est
        utilisé avant tout lancement public.
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Section title="1. Données collectées">
          Identité et coordonnées des utilisateurs (directeurs, enseignants, parents, élèves),
          informations de scolarité (classes, notes, présences), informations de paiement scolaire.
        </Section>
        <Section title="2. Finalité">
          Ces données sont utilisées exclusivement pour le fonctionnement du service : gestion
          scolaire, communication entre l'école et les familles, suivi pédagogique et administratif.
        </Section>
        <Section title="3. Responsable du traitement">
          Chaque établissement scolaire est responsable des données de ses élèves et de son personnel.
          Intellino agit en tant que sous-traitant technique de la plateforme.
        </Section>
        <Section title="4. Mineurs">
          Les comptes élèves sont créés et gérés par l'établissement ou les parents ; un mineur ne
          s'inscrit pas lui-même sur la plateforme.
        </Section>
        <Section title="5. Conservation">
          Les données sont conservées pendant la durée de la relation avec l'établissement, puis
          archivées ou supprimées conformément aux durées légales applicables.
        </Section>
        <Section title="6. Droits des utilisateurs">
          Toute personne peut demander l'accès, la rectification ou la suppression de ses données en
          contactant l'établissement concerné ou l'équipe EduAfrique.
        </Section>
        <Section title="7. Sécurité">
          Des mesures techniques (chiffrement des mots de passe, contrôle d'accès par rôle et par
          établissement) sont mises en œuvre pour protéger les données hébergées.
        </Section>
      </Box>
    </Container>
  );
}

function Section({ title, children }) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">{children}</Typography>
    </Box>
  );
}
