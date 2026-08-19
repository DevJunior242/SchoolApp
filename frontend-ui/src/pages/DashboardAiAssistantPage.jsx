import { useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Divider, Stack, Tab, Tabs, Typography } from "@mui/material";
import AiChatTab from "../components/AiChatTab.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";

const RISK_LABELS = {
  eleve: { label: "Risque élevé", color: "error", emoji: "⚠️" },
  moyen: { label: "Risque moyen", color: "warning", emoji: "🟡" },
  faible: { label: "Risque faible", color: "success", emoji: "🟢" },
};

const SUGGESTIONS = [
  "Quels sont les élèves les plus en difficulté cette année ?",
  "Quels élèves ont des paiements en retard ?",
  "Quels sont les chiffres clés de l'école ?",
  "Quels événements sont prévus prochainement ?",
  "Combien d'élèves dans chaque classe ?",
  "Quelles sont nos recettes par catégorie ce mois-ci ?",
  "Combien d'élèves ont mangé à la cantine aujourd'hui ?",
  "Y a-t-il des livres en retard à la bibliothèque ?",
  "Quel enseignant a le plus de cours ?",
  "Combien d'élèves prennent le bus ?",
  "Qui est le premier de chaque classe ?",
  "Quels élèves ont une faible moyenne ?",
  "Dans quelle matière les élèves ont-ils le plus de mal ?",
];

function RiskTab({ schoolId }) {
  const { data, loading, error } = useApiGet(`/schools/${schoolId}/students/risk-report`, {
    enabled: Boolean(schoolId),
  });

  const students = data?.students ?? [];

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (students.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        Aucun élève actif à afficher.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Score de risque d'abandon calculé à partir des absences, de la moyenne, des retards et des paiements en
        retard (règle métier, pas de prédiction IA).
      </Typography>

      {students.map((s) => {
        const risk = RISK_LABELS[s.level] ?? RISK_LABELS.faible;

        return (
          <Card key={s.student_id} variant="outlined">
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Box>
                  <Typography variant="subtitle2">
                    {risk.emoji} {s.fullname}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.matricule}
                  </Typography>
                </Box>
                <Chip size="small" label={`${risk.label} (${s.score} pts)`} color={risk.color} />
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Typography variant="caption">Moyenne : {s.average ?? "—"}/20</Typography>
                <Typography variant="caption">Absences : {s.absences}</Typography>
                <Typography variant="caption">Retards : {s.retards}</Typography>
                <Typography variant="caption">
                  Paiements : {s.payment_delay ? "en retard" : "à jour"}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

export default function DashboardAiAssistantPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const [tab, setTab] = useState("chat");

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

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Poser une question" value="chat" />
        <Tab label="Élèves à risque" value="risk" />
      </Tabs>

      {tab === "chat" ? (
        <AiChatTab
          endpoint={`/schools/${schoolId}/ai/ask`}
          suggestions={SUGGESTIONS}
          placeholder="Posez votre question sur les élèves, absences, paiements..."
          caption="L'assistant ne répond qu'à partir des données de votre école (élèves, notes, absences, paiements) ; les noms des élèves ne sont jamais transmis à l'IA sous forme de liste, seulement des codes anonymes."
        />
      ) : (
        <RiskTab schoolId={schoolId} />
      )}
    </Box>
  );
}
