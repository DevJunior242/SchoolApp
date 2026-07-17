import { Alert, Box, Container, Typography } from '@mui/material';

export default function TermsPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Conditions générales d'utilisation
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Dernière mise à jour : 16 juillet 2026 — version 1.0
      </Typography>

      <Alert severity="warning" sx={{ mb: 4 }}>
        Texte provisoire à titre indicatif. Il n'a pas été validé par un juriste et ne constitue pas
        un document contractuel définitif tant qu'il n'a pas été révisé par un professionnel du droit
        compétent pour les pays où EduAfrique est utilisé.
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Section title="1. Objet">
          Les présentes conditions régissent l'accès et l'utilisation de la plateforme EduAfrique,
          éditée par Intellino, par les établissements scolaires, leurs directions, enseignants,
          parents et élèves.
        </Section>
        <Section title="2. Compte utilisateur">
          Chaque utilisateur est responsable de la confidentialité de ses identifiants et des actions
          effectuées depuis son compte. Un directeur d'établissement est responsable des rôles qu'il
          attribue au sein de son école.
        </Section>
        <Section title="3. Données traitées">
          EduAfrique traite des données d'identification, de scolarité, de paiement et de présence
          nécessaires au fonctionnement du service. Le détail est précisé dans la politique de
          confidentialité.
        </Section>
        <Section title="4. Responsabilité">
          Intellino s'efforce d'assurer la disponibilité et la fiabilité du service, sans garantie
          absolue d'absence d'interruption ou d'erreur. La responsabilité d'Intellino ne saurait être
          engagée au-delà de ce que la loi applicable autorise à limiter.
        </Section>
        <Section title="5. Résiliation">
          Un établissement ou un utilisateur peut demander la suppression de son compte à tout moment.
          Certaines données peuvent être conservées pour des durées légales (comptabilité, obligations
          scolaires) avant suppression définitive.
        </Section>
        <Section title="6. Modification des conditions">
          Ces conditions peuvent évoluer ; toute modification substantielle donnera lieu à une nouvelle
          demande d'acceptation lors de la prochaine connexion.
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
