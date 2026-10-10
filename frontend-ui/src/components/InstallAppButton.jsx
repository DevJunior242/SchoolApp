import { useState, useSyncExternalStore } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import InstallMobileOutlined from "@mui/icons-material/InstallMobileOutlined";
import IosShareOutlined from "@mui/icons-material/IosShareOutlined";
import AddBoxOutlined from "@mui/icons-material/AddBoxOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import InstallDesktopIcon from "@mui/icons-material/InstallDesktop";
import {
  canPromptInstall,
  isAndroid,
  isAppleMobile,
  isEdge,
  isFirefox,
  isInstalled,
  promptInstall,
  subscribeInstall,
} from "../utils/installApp.js";

function Step({ icon, children }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      {icon}
      <Typography>{children}</Typography>
    </Stack>
  );
}

// Guide quand le navigateur ne propose pas l'installation lui-même
// (iPhone/iPad, Firefox, ou installation déjà refusée une fois).
function InstallGuide() {
  if (isAppleMobile()) {
    return (
      <>
        <Typography>
          Dans <strong>Safari</strong> :
        </Typography>
        <Step icon={<IosShareOutlined color="primary" />}>
          1. Touchez le bouton <strong>Partager</strong> (carré avec une flèche vers le haut).
        </Step>
        <Step icon={<AddBoxOutlined color="primary" />}>
          2. Choisissez <strong>« Sur l’écran d’accueil »</strong>, puis <strong>Ajouter</strong>.
        </Step>
      </>
    );
  }

  if (isFirefox()) {
    return (
      <Typography>
        Firefox ne permet pas d’installer l’application. Ouvrez ce site dans{" "}
        <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>, puis
        cliquez de nouveau sur « Installer l’application ».
      </Typography>
    );
  }

  if (isAndroid()) {
    return (
      <>
        <Step icon={<MoreVertIcon color="primary" />}>
          1. Touchez le menu <strong>⋮</strong> en haut à droite de Chrome.
        </Step>
        <Step icon={<AddBoxOutlined color="primary" />}>
          2. Choisissez <strong>« Installer l’application »</strong> ou{" "}
          <strong>« Ajouter à l’écran d’accueil »</strong>.
        </Step>
      </>
    );
  }

  // Ordinateur (Windows, Mac, Linux) avec Chrome ou Edge.
  return (
    <>
      <Step icon={<InstallDesktopIcon color="primary" />}>
        1. Dans la barre d’adresse, cliquez sur l’icône{" "}
        <strong>« Installer »</strong> (un écran avec une flèche), à droite.
      </Step>
      <Typography sx={{ color: "text.secondary" }}>Si elle n’apparaît pas :</Typography>
      <Step icon={<MoreVertIcon color="primary" />}>
        {isEdge() ? (
          <>
            2. Menu <strong>…</strong> → <strong>Applications</strong> →{" "}
            <strong>« Installer ce site en tant qu’application »</strong>.
          </>
        ) : (
          <>
            2. Menu <strong>⋮</strong> → <strong>Caster, enregistrer et partager</strong> →{" "}
            <strong>« Installer la page en tant qu’application »</strong>.
          </>
        )}
      </Step>
      <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
        Sous Windows, l’application apparaît alors sur le <strong>Bureau</strong> et dans le
        menu <strong>Démarrer</strong>, et s’ouvre dans sa propre fenêtre.
      </Typography>
    </>
  );
}

/**
 * « Installer l'application » : met Intellino Édu sur l'écran d'accueil du
 * téléphone ou de la tablette, ou sur le Bureau / menu Démarrer d'un PC
 * (icône, sa propre fenêtre, sans barre d'adresse). Visible tant que
 * l'application n'est pas installée ; si le navigateur ne propose pas
 * l'installation lui-même, ouvre un guide adapté. Repris d'Intellino shop.
 */
export default function InstallAppButton() {
  const promptReady = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);
  const [guideOpen, setGuideOpen] = useState(false);

  if (isInstalled()) return null;

  const handleClick = () => (promptReady ? promptInstall() : setGuideOpen(true));

  return (
    <>
      <Tooltip title="Mettre Intellino Édu sur l’écran d’accueil ou le Bureau">
        <span>
          <Button
            variant="outlined"
            size="small"
            startIcon={<InstallMobileOutlined />}
            onClick={handleClick}
            sx={{ display: { xs: "none", md: "inline-flex" }, mr: 1 }}
          >
            Installer l’application
          </Button>
          <IconButton
            onClick={handleClick}
            aria-label="Installer l’application"
            sx={{ display: { xs: "inline-flex", md: "none" } }}
          >
            <InstallMobileOutlined />
          </IconButton>
        </span>
      </Tooltip>

      <Dialog open={guideOpen} onClose={() => setGuideOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Installer l’application</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <InstallGuide />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuideOpen(false)}>Compris</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
