import { useEffect, useState } from "react";
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import TvIcon from "@mui/icons-material/Tv";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import api from "../api/axios.jsx";
import { asObject, getApiErrorMessage } from "../utils/apiData.js";

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Lien de l'écran d'accueil « QR seul » (mode QR sur écran, repris
 * d'Intellino RH) : l'appareil de l'accueil ouvre ce lien au lieu de rester
 * connecté au compte RH.
 */
export default function KioskLinkCard({ schoolId }) {
  const [kiosk, setKiosk] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    api
      .get(`/schools/${schoolId}/hr/attendance/kiosk`)
      .then((response) => setKiosk(asObject(response.data)))
      .catch((requestError) => setError(getApiErrorMessage(requestError, "Impossible de charger le lien d’affichage.")));
  }, [schoolId]);

  const url = kiosk?.token ? `${window.location.origin}/kiosque/${kiosk.token}` : "";

  async function call(method, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    try {
      const response = await api[method](`/schools/${schoolId}/hr/attendance/kiosk`);
      setKiosk(asObject(response.data));
      setCopied(false);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Action impossible."));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Copie impossible : sélectionnez le lien et copiez-le à la main.");
    }
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <TvIcon color="primary" />
          <Typography variant="h6">Écran d’accueil (QR seul)</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ouvrez ce lien sur l’appareil posé à l’accueil (tablette, vieux téléphone, écran) : il n’affiche que le QR,
          sans laisser votre compte RH connecté. Si l’appareil est volé ou quitte la page, personne n’accède aux
          données de l’école.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {kiosk?.active ? (
          <>
            <TextField
              fullWidth
              size="small"
              value={url}
              slotProps={{ htmlInput: { readOnly: true, onFocus: (event) => event.target.select() } }}
              helperText={`Créé le ${formatDateTime(kiosk.generated_at)} · ne le partagez pas en dehors de l’accueil.`}
              sx={{ mb: 1.5 }}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={copy}>
                {copied ? "Lien copié" : "Copier le lien"}
              </Button>
              <Button startIcon={<OpenInNewIcon />} href={url} target="_blank" rel="noopener">
                Ouvrir
              </Button>
              <Button
                color="warning"
                disabled={busy}
                onClick={() =>
                  call(
                    "post",
                    "Créer un nouveau lien ? L’écran d’accueil actuel cessera d’afficher le QR jusqu’à ce que vous y ouvriez le nouveau lien.",
                  )
                }
              >
                Nouveau lien
              </Button>
              <Button
                color="error"
                disabled={busy}
                onClick={() => call("delete", "Désactiver l’écran d’accueil ? Le lien actuel ne fonctionnera plus.")}
              >
                Désactiver
              </Button>
            </Stack>
          </>
        ) : (
          <Button variant="contained" startIcon={<TvIcon />} disabled={busy || !kiosk} onClick={() => call("post")}>
            Créer le lien de l’écran d’accueil
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
