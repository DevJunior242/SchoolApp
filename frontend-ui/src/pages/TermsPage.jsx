import { Box, Container, Typography } from '@mui/material';

export default function TermsPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Conditions générales d'utilisation
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Dernière mise à jour : 7 septembre 2026 — version 2.0
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Section title="1. Objet">
          Intellino Edu est une plateforme de gestion scolaire éditée par Intellino. Elle permet aux
          établissements de gérer leurs élèves, classes, inscriptions, personnels, notes, présences,
          paiements, communications et documents selon les modules activés pour leur établissement.
        </Section>
        <Section title="2. Création de l'établissement et choix du tarif">
          Lors de la création d'une école, l'utilisateur choisit l'un des tarifs actifs proposés par
          l'administrateur de la plateforme. Le tarif sélectionné est rattaché à l'établissement et
          détermine les modules, limites et conditions de facturation applicables. Les tarifs peuvent
          évoluer ; une modification ne prend effet pour l'établissement qu'après validation selon le
          processus prévu par la plateforme.
        </Section>
        <Section title="3. Comptes et rôles">
          Chaque utilisateur doit conserver ses identifiants confidentiels et signaler toute utilisation
          non autorisée de son compte. Le directeur de l'établissement administre les membres et les
          rôles de son école. Les accès sont séparés selon les fonctions : direction, secrétariat,
          comptabilité, ressources humaines, enseignants, parents et élèves. Un utilisateur ne doit pas
          utiliser un rôle ou les données d'une autre personne.
        </Section>
        <Section title="4. Données scolaires et responsabilités de l'établissement">
          L'établissement reste responsable des informations qu'il saisit, de leur exactitude et des
          autorisations accordées à ses utilisateurs. Intellino Edu traite les données nécessaires au
          fonctionnement du service, notamment les données d'identification, de scolarité, de présence,
          de santé lorsque le module correspondant est activé, et de paiement scolaire. Les règles
          détaillées sont présentées dans la politique de confidentialité.
        </Section>
        <Section title="5. Paiements et abonnements">
          Les montants, périodicités et moyens de paiement disponibles sont ceux affichés pour le tarif
          choisi. Un paiement déclaré peut rester en attente jusqu'à sa vérification par l'établissement
          ou l'équipe habilitée. L'accès à certains modules ou fonctionnalités peut être limité lorsque
          le tarif ne les comprend pas ou lorsqu'un abonnement arrive à échéance.
        </Section>
        <Section title="6. Modules et disponibilité">
          Les modules disponibles peuvent inclure la gestion académique, la comptabilité, les ressources
          humaines, la bibliothèque, la cantine, la santé scolaire, le transport et l'assistance. Leur
          disponibilité dépend du tarif de l'établissement et de l'état du service. Intellino met en œuvre
          des mesures raisonnables pour maintenir la plateforme, sans garantir une disponibilité absolue
          ni l'absence de maintenance ou d'incident.
        </Section>
        <Section title="7. Utilisation acceptable">
          Il est interdit de contourner les contrôles d'accès, d'utiliser les données à des fins
          frauduleuses, de transmettre des contenus illicites ou de perturber le fonctionnement de la
          plateforme. L'établissement doit respecter les règles applicables à la protection des mineurs,
          à la confidentialité et à la conservation des dossiers scolaires.
        </Section>
        <Section title="8. Résiliation et conservation">
          Un établissement ou un utilisateur peut demander la fermeture de son compte selon la procédure
          disponible. Certaines données peuvent être conservées pendant la durée nécessaire aux obligations
          légales, comptables ou scolaires, puis supprimées ou anonymisées selon les règles applicables.
        </Section>
        <Section title="9. Modification des conditions">
          Intellino Edu peut faire évoluer ces conditions pour tenir compte des fonctionnalités, tarifs ou
          obligations applicables. Les changements importants seront signalés dans la plateforme et, lorsque
          nécessaire, soumis à une nouvelle acceptation.
        </Section>
        <Section title="10. Contact">
          Pour toute question concernant ces conditions, contactez l'équipe Intellino à l'adresse
          contact@intellino.tech.
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
