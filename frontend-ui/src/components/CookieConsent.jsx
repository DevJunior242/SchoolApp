import { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";

const STORAGE_KEY = "schoolapp-cookie-consent-v1";

const defaultPreferences = {
  necessary: true,
  analytics: false,
};

const ANALYTICS_SCRIPT_SRC =
  "https://www.googletagmanager.com/gtag/js?id=G-09XJ2Q40M6";

function normalizePreferences(preferences = {}) {
  return {
    ...defaultPreferences,
    ...preferences,
    necessary: true,
    analytics: Boolean(preferences.analytics),
  };
}

function ensureScript({ id, src, async = true }) {
  if (!document || document.getElementById(id)) {
    return;
  }

  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = async;
  script.defer = true;
  document.head.appendChild(script);
}

function ensureInlineScript({ id, content }) {
  if (!document || document.getElementById(id)) {
    return;
  }

  const script = document.createElement("script");
  script.id = id;
  script.textContent = content;
  document.head.appendChild(script);
}

function removeElementById(id) {
  if (!document) {
    return;
  }

  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }
}

function applyConsentScripts(preferences) {
  if (preferences.analytics) {
    ensureScript({
      id: "schoolapp-analytics-script",
      src: ANALYTICS_SCRIPT_SRC,
    });

    ensureInlineScript({
      id: "schoolapp-analytics-init",
      content: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){ window.dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-09XJ2Q40M6');
      `,
    });

    return;
  }

  removeElementById("schoolapp-analytics-script");
  removeElementById("schoolapp-analytics-init");
}

export function CookieConsentButton({ sx }) {
  return (
    <Button
      variant="text"
      size="small"
      sx={{
        minWidth: 0,
        px: 0.5,
        textTransform: "none",
        ...sx,
      }}
      onClick={() =>
        window.dispatchEvent(new CustomEvent("open-cookie-consent"))
      }
    >
      Cookies
    </Button>
  );
}

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences(normalizePreferences(parsed));
      } catch {
        setPreferences(defaultPreferences);
      }
      return;
    }

    setOpen(true);
  }, []);

  useEffect(() => {
    const handleOpen = () => setOpen(true);

    window.addEventListener("open-cookie-consent", handleOpen);
    return () => window.removeEventListener("open-cookie-consent", handleOpen);
  }, []);

  useEffect(() => {
    applyConsentScripts(preferences);
  }, [preferences]);

  function updatePreference(key, checked) {
    setPreferences((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  function saveConsent(nextPreferences) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
    setPreferences(nextPreferences);
    setOpen(false);
  }

  function handleAcceptRequired() {
    saveConsent({
      necessary: true,
      analytics: false,
    });
  }

  function handleAcceptAll() {
    saveConsent({
      necessary: true,
      analytics: true,
    });
  }

  function handleSaveChoices() {
    saveConsent(preferences);
  }

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          return;
        }

        setOpen(false);
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Gestion des cookies</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Nous utilisons des cookies nécessaires au bon fonctionnement du site,
          ainsi que des cookies analytiques si vous les acceptez.
        </DialogContentText>

        <Stack spacing={1}>
          <FormControlLabel
            control={<Checkbox checked={preferences.necessary} disabled />}
            label="Cookies nécessaires"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={preferences.analytics}
                onChange={(event) =>
                  updatePreference("analytics", event.target.checked)
                }
              />
            }
            label="Cookies analytiques"
          />
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Vous pouvez modifier vos choix à tout moment depuis le lien Cookies
          dans le footer.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
        <Button onClick={handleAcceptRequired} color="inherit">
          Seulement nécessaires
        </Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={handleSaveChoices} variant="outlined">
            Enregistrer
          </Button>
          <Button onClick={handleAcceptAll} variant="contained">
            Tout accepter
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
