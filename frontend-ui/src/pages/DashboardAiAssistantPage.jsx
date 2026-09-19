import { useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import AiChatTab from "../components/AiChatTab.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { useSchools } from "../hooks/useSchools.js";
const RISK_LABELS = {
  eleve: { label: "Risque élevé", color: "error", emoji: "⚠️" },
  moyen: { label: "Risque moyen", color: "warning", emoji: "🟡" },
  faible: { label: "Risque faible", color: "success", emoji: "🟢" },
};

const SUGGESTIONS = [
  "Quels sont les élèves les plus en difficulté cette année ?",
  "Quels élèves ont des paiements en retard ?",
  "Quels sont les chiffres clés de l'école ?",
  "Quel est le montant total des paiements confirmés ce mois-ci ?",
  "Quel est notre taux de recouvrement ce mois-ci ?",
  "Quelles dépenses confirmées sont les plus importantes ce mois-ci ?",
  "Quel est le solde disponible dans nos caisses et comptes bancaires ?",
  "Combien reste-t-il d'impayés à recouvrer ?",
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
  "Quelle est la moyenne générale des élèves cette année ?",
  "Quelles classes ont les résultats les plus faibles aux examens ?",
  "Quelles matières posent le plus de difficultés aux examens ?",
];

function RiskTab({ schoolId }) {
  const { data, loading, error } = useApiGet(
    `/schools/${schoolId}/students/risk-report`,
    {
      enabled: Boolean(schoolId),
    },
  );

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
        Score de risque d'abandon calculé à partir des absences, de la moyenne,
        des retards et des paiements en retard (règle métier, pas de prédiction
        IA).
      </Typography>

      {students.map((s) => {
        const risk = RISK_LABELS[s.level] ?? RISK_LABELS.faible;

        return (
          <Card key={s.student_id} variant="outlined">
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={1}
              >
                <Box>
                  <Typography variant="subtitle2">
                    {risk.emoji} {s.fullname}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.matricule}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={`${risk.label} (${s.score} pts)`}
                  color={risk.color}
                />
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Typography variant="caption">
                  Moyenne : {s.average ?? "—"}/20
                </Typography>
                <Typography variant="caption">
                  Absences : {s.absences}
                </Typography>
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
  const { schoolUsers } = useSchools();
  const currentMembership = schoolUsers.find(
    (membership) => membership.school?.id === schoolId,
  );
  const roleSlug = currentMembership?.role?.slug;
  const isTeacher = ["professeur", "enseignant"].includes(roleSlug);
  const isAccountant = roleSlug === "comptable";
  const isHr = roleSlug === "rh";
  const isAttendanceStaff = ["censeur", "surveillant"].includes(roleSlug);
  const isHealthStaff = roleSlug === "infirmier";
  const [tab, setTab] = useState("chat");

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  const suggestions = isTeacher
    ? [
        "Quelles sont mes classes et mes matières ?",
        "Quels sont les élèves de mes classes ?",
        "Quelles sont les moyennes de mes classes ?",
        "Combien d'absences ont été enregistrées dans mes classes ?",
        "Quels événements concernent mes classes ?",
      ]
    : isHealthStaff
      ? [
          "Combien d'élèves ont un dossier santé ?",
          "Quels élèves ont des allergies enregistrées ?",
          "Quelles sont les visites médicales récentes ?",
        ]
      : isHr
        ? [
            "Quel est l'effectif actuel du personnel ?",
            "Quels sont les congés en cours ou à venir ?",
            "Quels sont les pointages du personnel ce mois-ci ?",
          ]
        : isAttendanceStaff
          ? [
              "Combien d'élèves sont absents aujourd'hui ?",
              "Quelles justifications sont en attente ?",
              "Quels événements sont prévus prochainement ?",
            ]
          : isAccountant
            ? [
                "Quels paiements sont en retard ?",
                "Quel est le solde de nos comptes de trésorerie ?",
                "Quelles sont les dépenses par catégorie ce mois-ci ?",
                "Quelles sont nos recettes par catégorie ce mois-ci ?",
                "Quels événements sont prévus prochainement ?",
              ]
            : SUGGESTIONS;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Assistant IA
      </Typography>

      {!isTeacher &&
        !isAccountant &&
        !isHr &&
        !isAttendanceStaff &&
        !isHealthStaff && (
          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Poser une question" value="chat" />
            <Tab label="Élèves à risque" value="risk" />
          </Tabs>
        )}

      {isTeacher ||
      isAccountant ||
      isHr ||
      isAttendanceStaff ||
      isHealthStaff ||
      tab === "chat" ? (
        <AiChatTab
          endpoint={`/schools/${schoolId}/ai/${isTeacher ? "ask-teacher" : isHr ? "ask-hr" : isAttendanceStaff ? "ask-attendance" : isHealthStaff ? "ask-health" : "ask"}`}
          suggestions={suggestions}
          placeholder={
            isTeacher
              ? "Posez une question sur vos classes et vos matières..."
              : isHealthStaff
                ? "Posez une question sur les dossiers santé des élèves..."
                : isHr
                  ? "Posez une question sur le personnel, les congés et les pointages..."
                  : isAttendanceStaff
                    ? "Posez une question sur les absences et les justifications..."
                    : isAccountant
                      ? "Posez une question sur les paiements et la trésorerie..."
                      : "Posez votre question sur les élèves, absences, paiements..."
          }
          caption={
            isTeacher
              ? "L'assistant est limité à vos classes et matières attribuées."
              : isHealthStaff
                ? "L'assistant est limité aux données de santé scolaire autorisées."
                : isHr
                  ? "L'assistant est limité au personnel, aux congés et aux pointages de l'école."
                  : isAttendanceStaff
                    ? "L'assistant est limité aux absences, justifications et événements de l'école."
                    : isAccountant
                      ? "L'assistant est limité aux finances et aux événements de l'école."
                      : "L'assistant ne répond qu'à partir des données autorisées de votre école."
          }
        />
      ) : (
        <RiskTab schoolId={schoolId} />
      )}
    </Box>
  );
}
