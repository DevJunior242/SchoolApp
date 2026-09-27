import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import QRCode from "qrcode";
import { AnimatePresence, motion } from "motion/react";
import api from "../api/axios.jsx";
import { asObject, getApiErrorMessage } from "../utils/apiData.js";

const REFRESH_MS = 25000;

/**
 * Écran d'accueil « QR seul » (repris d'Intellino RH) : ouvert avec un lien
 * secret, aucun compte connecté. Si l'appareil quitte cette page, il n'y a
 * rien d'autre à voir.
 */
export default function KioskPage() {
  const { token } = useParams();
  const [qr, setQr] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const wakeLock = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timer;

    const refresh = async () => {
      try {
        const response = await api.get(`/kiosk/${token}`);
        const data = asObject(response.data);
        const dataUrl = await QRCode.toDataURL(data.token, { width: 640, margin: 2 });
        if (!cancelled) {
          setQr({ ...data, dataUrl });
          setError("");
        }
        timer = setTimeout(refresh, REFRESH_MS);
      } catch (requestError) {
        if (cancelled) return;
        const status = requestError.response?.status;
        setError(getApiErrorMessage(requestError, "Connexion au serveur impossible. Nouvel essai…"));
        // Lien révoqué : inutile d'insister. Coupure réseau : on réessaie.
        if (status !== 404 && status !== 422) timer = setTimeout(refresh, 10000);
      }
    };

    refresh();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Garde l'écran allumé quand le navigateur le permet.
  useEffect(() => {
    const request = () =>
      navigator.wakeLock
        ?.request("screen")
        .then((lock) => {
          wakeLock.current = lock;
        })
        .catch(() => {});
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      wakeLock.current?.release().catch(() => {});
    };
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        p: 3,
        textAlign: "center",
      }}
    >
      <Box>
        <Typography variant="h4" component="h1">
          {qr?.school_name || "Pointage du personnel"}
        </Typography>
        <Typography variant="h2" component="p" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </Typography>
        <Typography color="text.secondary" sx={{ "&::first-letter": { textTransform: "uppercase" } }}>
          {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </Typography>
      </Box>

      {error && !qr ? (
        <Typography color="error" variant="h6" sx={{ maxWidth: 520 }}>
          {error}
        </Typography>
      ) : !qr ? (
        <CircularProgress />
      ) : (
        <Box sx={{ bgcolor: "#fff", p: 2, borderRadius: 4, boxShadow: 6, width: "min(80vw, 60vh, 520px)", aspectRatio: "1 / 1" }}>
          <AnimatePresence mode="wait">
            <Box
              key={qr.token}
              component={motion.img}
              src={qr.dataUrl}
              alt="QR code de pointage"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.4 }}
              transition={{ duration: 0.3 }}
              sx={{ width: "100%", height: "100%", display: "block" }}
            />
          </AnimatePresence>
        </Box>
      )}

      {error && qr && <Typography color="warning.main">{error}</Typography>}

      <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 560 }}>
        Ouvrez IntellIno Édu sur votre téléphone, menu <strong>Mon pointage</strong>, et scannez ce code à
        votre arrivée et à votre départ.
      </Typography>

      {document.fullscreenEnabled && !document.fullscreenElement && (
        <Button startIcon={<FullscreenIcon />} onClick={() => document.documentElement.requestFullscreen().catch(() => {})}>
          Plein écran
        </Button>
      )}
    </Box>
  );
}
