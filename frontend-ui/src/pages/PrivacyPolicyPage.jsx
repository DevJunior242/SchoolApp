import { Box, Container, Typography } from '@mui/material';

export default function PrivacyPolicyPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Politique de confidentialité
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Dernière mise à jour : 7 septembre 2026 — version 2.0
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Section title="1. Données collectées">
          Intellino Edu peut traiter les données d'identité et de contact des utilisateurs, les
          inscriptions scolaires, classes, notes, présences, paiements, messages et informations du
          personnel. Lorsque le module santé est activé, des informations médicales nécessaires au
          suivi scolaire peuvent également être enregistrées.
        </Section>
        <Section title="2. Finalité">
          Les données servent à fournir les fonctionnalités demandées : gestion administrative et
          pédagogique, communication entre l'école et les familles, suivi des paiements, gestion du
          personnel, bibliothèque, cantine, transport et suivi de santé lorsque ces modules sont actifs.
        </Section>
        <Section title="3. Responsable du traitement">
          Chaque établissement est responsable des données qu'il saisit et des autorisations qu'il
          donne à ses utilisateurs. Intellino fournit l'infrastructure et les outils techniques du
          service. Les données sont séparées par établissement afin qu'une école n'accède pas aux
          données privées d'une autre école.
        </Section>
        <Section title="4. Mineurs">
          Les comptes et inscriptions des élèves sont créés ou gérés par l'établissement et, selon le
          cas, par les parents. Les responsables doivent utiliser la plateforme conformément aux règles
          applicables à la protection des mineurs.
        </Section>
        <Section title="5. Isolation des données">
          L'identité d'un élève peut rester la même lorsqu'il change d'établissement, mais ses
          inscriptions, paiements, absences, visites médicales, traitements et documents de santé sont
          contrôlés selon l'école concernée. Les dossiers médicaux privés sont liés à l'établissement
          qui les a créés.
        </Section>
        <Section title="6. Conservation">
          Les données sont conservées pendant la durée nécessaire au fonctionnement du service et aux
          obligations administratives, comptables ou scolaires applicables. Elles peuvent ensuite être
          supprimées ou anonymisées selon les règles en vigueur.
        </Section>
        <Section title="7. Droits des utilisateurs">
          Toute personne peut demander l'accès, la rectification ou la suppression de ses données en
          contactant l'établissement concerné ou l'équipe Intellino à l'adresse contact@intellino.tech.
        </Section>
        <Section title="8. Sécurité">
          Intellino met en œuvre des mesures techniques et organisationnelles, notamment le hachage des
          mots de passe, l'authentification, le contrôle des rôles, le cloisonnement par établissement,
          la limitation des accès financiers et la protection des fichiers stockés.
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
