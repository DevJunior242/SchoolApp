import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import QrScanner from "qr-scanner";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function DashboardMyAttendancePage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadStatus() {
    if (!schoolId) return;

    try {
      const [todayResponse, historyResponse] = await Promise.all([
        api.get(`/schools/${schoolId}/my-attendance`),
        api.get(`/schools/${schoolId}/my-attendance/history`),
      ]);
      setStatus(todayResponse.data);
      setHistory(historyResponse.data ?? []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Impossible de charger votre présence.",
      );
    }
  }

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      if (!schoolId) return;

      try {
        const [todayResponse, historyResponse] = await Promise.all([
          api.get(`/schools/${schoolId}/my-attendance`),
          api.get(`/schools/${schoolId}/my-attendance/history`),
        ]);

        if (!cancelled) {
          setStatus(todayResponse.data);
          setHistory(historyResponse.data ?? []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.response?.data?.message ||
              "Impossible de charger votre présence.",
          );
        }
      }
    };

    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const value = result?.data?.trim();
        if (value) {
          setToken(value);
          scanner.stop();
        }
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true,
      },
    );

    scannerRef.current = scanner;
    scanner.start().catch(() => {
      setError("Impossible d’ouvrir la caméra pour scanner le QR code.");
    });

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [schoolId]);

  async function handlePunch() {
    if (!token) {
      setError("Scannez d’abord le QR ou collez son contenu.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        `/schools/${schoolId}/hr/attendance/punch`,
        {
          token,
        },
      );
      setSuccess(response.data.message || "Pointage enregistré.");
      setToken("");
      await loadStatus();
    } catch (requestError) {
      const messages = requestError.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : requestError.response?.data?.message ||
              "Impossible d’enregistrer votre pointage.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Pointage du personnel
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Scannez le QR affiché par le RH pour enregistrer votre arrivée ou
        départ.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              État du jour
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {status?.status === "completed"
                ? "Aujourd’hui : présence terminée."
                : status?.status === "in_progress"
                  ? "Aujourd’hui : arrivée enregistrée, départ à confirmer."
                  : "Aujourd’hui : aucun pointage enregistré."}
            </Typography>
            <Typography>
              Arrivée :{" "}
              {status?.attendance?.check_in
                ? new Date(status.attendance.check_in).toLocaleString("fr-FR")
                : "—"}
            </Typography>
            <Typography>
              Départ :{" "}
              {status?.attendance?.check_out
                ? new Date(status.attendance.check_out).toLocaleString("fr-FR")
                : "—"}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, p: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Scanner le QR
            </Typography>
            <Box
              sx={{
                width: "100%",
                maxWidth: 420,
                aspectRatio: "1 / 1",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
                background: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video
                ref={videoRef}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          </CardContent>
        </Card>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pointage manuel
          </Typography>
          <TextField
            label="Code QR"
            value={token}
            onChange={(event) => setToken(event.target.value.trim())}
            fullWidth
            multiline
            minRows={4}
            placeholder="Collez ici le contenu du QR si la caméra ne fonctionne pas"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<QrCodeScannerIcon />}
            onClick={handlePunch}
            disabled={submitting || !token}
          >
            {submitting ? "Enregistrement..." : "Pointer"}
          </Button>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Historique récent
        </Typography>
        <Card variant="outlined">
          <CardContent>
            {history.length === 0 ? (
              <Typography color="text.secondary">
                Aucun historique disponible.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {history.map((entry) => (
                  <Box
                    key={entry.id}
                    sx={{
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      pb: 1,
                    }}
                  >
                    <Typography fontWeight={700}>
                      {new Date(entry.attendance_date).toLocaleDateString(
                        "fr-FR",
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Arrivée :{" "}
                      {entry.check_in
                        ? new Date(entry.check_in).toLocaleString("fr-FR")
                        : "—"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Départ :{" "}
                      {entry.check_out
                        ? new Date(entry.check_out).toLocaleString("fr-FR")
                        : "—"}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
