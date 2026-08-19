import { Box, Typography } from "@mui/material";
import AiChatTab from "../components/AiChatTab.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const SUGGESTIONS = [
  "Est-ce que mon enfant a des absences récentes ?",
  "Quelle est sa moyenne générale ?",
  "Est-ce que j'ai fini de payer les frais de scolarité ?",
  "Quels événements sont prévus prochainement ?",
];

export default function ParentAiAssistantPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Assistant IA
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Posez vos questions sur la scolarité de vos enfants (absences, notes, paiements) ou sur les événements de
        l'école.
      </Typography>

      <AiChatTab
        endpoint={`/schools/${schoolId}/ai/ask-parent`}
        suggestions={SUGGESTIONS}
        placeholder="Posez votre question sur votre/vos enfant(s)..."
        caption="L'assistant ne répond qu'à partir des données de vos propres enfants dans cette école, jamais celles d'un autre élève ni des données globales de l'école."
      />
    </Box>
  );
}
