import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import DevicesIcon from "@mui/icons-material/Devices";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import api from "../api/axios.jsx";
import { asArray, asObject, getApiErrorMessage } from "../utils/apiData.js";

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

// Connexion de moins de 48 h : mise en avant pour repérer un appareil inconnu.
const RECENT_MS = 48 * 60 * 60 * 1000;

/**
 * « Appareils connectés » (page Sécurité) : chaque session ouverte avec son
 * appareil, son adresse IP et sa dernière activité. Une session utilisée depuis
 * un autre appareil que celui de la connexion est signalée en rouge.
 */
export default function ActiveSessionsCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await api.get("/me/sessions");
    setData(asObject(response.data));
  }

  useEffect(() => {
    let cancelled = false;
    api
      .get("/me/sessions")
      .then((response) => !cancelled && setData(asObject(response.data)))
      .catch((requestError) => !cancelled && setError(getApiErrorMessage(requestError, "Impossible de charger vos appareils.")));
    return () => {
      cancelled = true;
    };
  }, []);

  async function disconnect(session) {
    if (!window.confirm(`Déconnecter « ${session.device} » ? Il faudra se reconnecter sur cet appareil.`)) return;
    setError("");
    setMessage("");
    try {
      await api.delete(`/me/sessions/${session.id}`);
      setMessage("Appareil déconnecté.");
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible de déconnecter cet appareil."));
    }
  }

  async function disconnectOthers() {
    if (!window.confirm("Déconnecter tous vos autres appareils ? Seul celui-ci restera connecté.")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post("/me/sessions/logout-others");
      setMessage(asObject(response.data).message || "Autres appareils déconnectés.");
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible de déconnecter les autres appareils."));
    } finally {
      setBusy(false);
    }
  }

  const sessions = asArray(data?.sessions);
  const others = sessions.filter((session) => !session.is_current);
  const hasSuspicious = sessions.some((session) => session.suspicious);
  const idleDays = data?.idle_days || 30;

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 560, mt: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
          <DevicesIcon color="primary" />
          <Typography variant="h6">Appareils connectés</Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Les appareils où votre compte est ouvert. Vous en voyez un que vous ne connaissez pas ? Déconnectez-le, puis
          changez votre mot de passe. Un appareil inutilisé pendant {idleDays} jours est déconnecté automatiquement.
        </Typography>

        {hasSuspicious && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Une de vos sessions a été utilisée depuis un autre appareil que celui de la connexion. Si ce n’est pas vous,
            déconnectez tous les autres appareils et changez votre mot de passe.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>
            {message}
          </Alert>
        )}

        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {sessions.map((session) => {
            const recent = !session.is_current && Date.now() - new Date(session.created_at).getTime() < RECENT_MS;
            const usedElsewhere = session.last_device && session.last_device !== session.device;

            return (
              <Box
                key={session.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: session.suspicious ? "error.main" : "divider",
                  display: "flex",
                  gap: 1.5,
                  alignItems: { xs: "flex-start", sm: "center" },
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
                    <Typography sx={{ fontWeight: 600 }}>{session.device}</Typography>
                    {session.is_current && <Chip size="small" color="success" label="Cet appareil" />}
                    {recent && <Chip size="small" color="warning" label="Nouvelle connexion" />}
                    {session.suspicious && (
                      <Chip size="small" color="error" icon={<WarningAmberIcon />} label="Activité inhabituelle" />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Connecté le {formatDateTime(session.created_at)}
                    {session.ip_address ? ` · IP ${session.ip_address}` : ""}
                  </Typography>
                  <Typography variant="body2" color={usedElsewhere ? "error" : "text.secondary"}>
                    Dernière activité {formatDateTime(session.last_used_at)}
                    {usedElsewhere ? ` depuis ${session.last_device}` : ""}
                    {session.last_ip && session.last_ip !== session.ip_address ? ` · IP ${session.last_ip}` : ""}
                  </Typography>
                </Box>
                {!session.is_current && (
                  <Button size="small" color="error" variant={session.suspicious ? "contained" : "outlined"} onClick={() => disconnect(session)}>
                    Déconnecter
                  </Button>
                )}
              </Box>
            );
          })}
          {data && sessions.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucune session ouverte.
            </Typography>
          )}
        </Stack>

        <Button variant="outlined" color="error" onClick={disconnectOthers} disabled={busy || others.length === 0}>
          {busy ? "Déconnexion..." : "Déconnecter tous les autres appareils"}
        </Button>
    </Paper>
  );
}
