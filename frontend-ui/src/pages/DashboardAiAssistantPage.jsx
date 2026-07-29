import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import api from "../api/axios.jsx";
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
];

function ChatTab({ schoolId }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function ask(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/schools/${schoolId}/ai/ask`, { question: trimmed });
      setMessages((prev) => [...prev, { role: "assistant", text: response.data?.answer }]);
    } catch (err) {
      const message = err.response?.data?.message || "Une erreur est survenue. Réessayez.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={2}>
      {messages.length === 0 && (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Exemples de questions :
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} label={s} onClick={() => ask(s)} variant="outlined" />
            ))}
          </Stack>
        </Stack>
      )}

      {messages.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, maxHeight: 420, overflowY: "auto" }}>
          <Stack spacing={2}>
            {messages.map((m, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                {m.role === "assistant" ? <SmartToyIcon color="primary" fontSize="small" /> : <PersonIcon fontSize="small" />}
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {m.text}
                </Typography>
              </Stack>
            ))}
            {loading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  L'assistant réfléchit...
                </Typography>
              </Stack>
            )}
          </Stack>
        </Paper>
      )}

      {error && <Alert severity="warning">{error}</Alert>}

      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder="Posez votre question sur les élèves, absences, paiements..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ask(question);
          }}
          disabled={loading}
        />
        <Button variant="contained" endIcon={<SendIcon />} onClick={() => ask(question)} disabled={loading}>
          Envoyer
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        L'assistant ne répond qu'à partir des données de votre école (élèves, notes, absences, paiements) ;
        les noms des élèves ne sont jamais transmis à l'IA sous forme de liste, seulement des codes anonymes.
      </Typography>
    </Stack>
  );
}

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

      {tab === "chat" ? <ChatTab schoolId={schoolId} /> : <RiskTab schoolId={schoolId} />}
    </Box>
  );
}
