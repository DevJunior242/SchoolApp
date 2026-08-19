import { useState } from "react";
import { Alert, Chip, CircularProgress, Paper, Stack, TextField, Typography, Button } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import api from "../api/axios.jsx";

/**
 * Onglet de chat de l'assistant IA, partagé entre la page directeur
 * (DashboardAiAssistantPage, endpoint /ai/ask) et la page parent
 * (ParentAiAssistantPage, endpoint /ai/ask-parent) : même UI, seule la
 * route appelée et les suggestions affichées diffèrent — les garde-fous
 * (anonymisation, périmètre des données) sont gérés côté backend, pas ici.
 */
export default function AiChatTab({ endpoint, suggestions, placeholder, caption }) {
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
      const response = await api.post(endpoint, { question: trimmed });
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
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ maxWidth: "100%" }}>
            {suggestions.map((s) => (
              <Chip
                key={s}
                label={s}
                onClick={() => ask(s)}
                variant="outlined"
                sx={{
                  maxWidth: "100%",
                  height: "auto",
                  "& .MuiChip-label": {
                    whiteSpace: "normal",
                    display: "block",
                    py: 0.75,
                  },
                }}
              />
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
          placeholder={placeholder}
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
        {caption}
      </Typography>
    </Stack>
  );
}
