import { useEffect, useState } from "react";
import { Chip } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useAuth } from "../context/AuthContext.jsx";
import {
  countPending,
  flushQueue,
  QUEUE_CHANGED_EVENT,
} from "../offline/sync.js";

// Nouvel essai régulier : l'évènement "online" ne se déclenche pas toujours
// quand le réseau revient faiblement (2G/3G instable).
const RETRY_INTERVAL_MS = 60000;

// Envoie les saisies faites hors connexion quelle que soit la page ouverte,
// et affiche partout combien restent à envoyer.
export default function OfflineSyncManager() {
  const { user } = useAuth();
  const userId = user?.id;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!userId) return undefined;

    const refreshCount = () =>
      countPending(userId)
        .then(setPendingCount)
        .catch(() => {});
    const flush = () => {
      if (navigator.onLine) flushQueue(userId).catch(() => {});
    };

    flush();
    refreshCount();
    const interval = setInterval(flush, RETRY_INTERVAL_MS);
    window.addEventListener("online", flush);
    window.addEventListener(QUEUE_CHANGED_EVENT, refreshCount);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", flush);
      window.removeEventListener(QUEUE_CHANGED_EVENT, refreshCount);
    };
  }, [userId]);

  if (!userId || pendingCount === 0) return null;

  return (
    <Chip
      icon={<CloudUploadIcon />}
      color="warning"
      label={`${pendingCount} saisie${pendingCount > 1 ? "s" : ""} en attente d’envoi`}
      onClick={() => flushQueue(userId).catch(() => {})}
      sx={{
        position: "fixed",
        left: 16,
        bottom: 16,
        zIndex: (theme) => theme.zIndex.snackbar,
        boxShadow: 3,
      }}
    />
  );
}
