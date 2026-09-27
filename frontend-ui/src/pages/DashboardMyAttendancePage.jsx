import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import QrScanner from "qr-scanner";
import api from "../api/axios.jsx";
import { asArray, getApiErrorMessage } from "../utils/apiData.js";
import { getCurrentPosition, getStaffDeviceId } from "../utils/staffDevice.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function DashboardMyAttendancePage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const punchRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deviceMismatch, setDeviceMismatch] = useState(false);
  const [requestingDevice, setRequestingDevice] = useState(false);

  async function loadStatus() {
    if (!schoolId) return;

    try {
      const [todayResponse, historyResponse] = await Promise.all([
        api.get(`/schools/${schoolId}/my-attendance`),
        api.get(`/schools/${schoolId}/my-attendance/history`),
      ]);
      setStatus(todayResponse.data);
      setHistory(asArray(historyResponse.data));
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Impossible de charger votre présence."),
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
          setHistory(asArray(historyResponse.data));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            getApiErrorMessage(
              requestError,
              "Impossible de charger votre présence.",
            ),
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
          scanner.stop();
          punchRef.current?.(value);
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

  async function handlePunch(token) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    setDeviceMismatch(false);

    try {
      const position = status?.gps_required ? await getCurrentPosition() : null;
      const response = await api.post(
        `/schools/${schoolId}/hr/attendance/punch`,
        {
          token,
          device_id: getStaffDeviceId(),
          ...(position || {}),
        },
      );
      setSuccess(response.data.message || "Pointage enregistré.");
      await loadStatus();
    } catch (requestError) {
      setDeviceMismatch(requestError.response?.data?.code === "device_mismatch");
      setError(
        getApiErrorMessage(
          requestError,
          "Impossible d’enregistrer votre pointage.",
        ),
      );
    } finally {
      setSubmitting(false);
      // Relance la caméra pour un prochain scan (départ, nouvel essai).
      setTimeout(() => scannerRef.current?.start().catch(() => {}), 3000);
    }
  }

  useEffect(() => {
    punchRef.current = handlePunch;
  });

  async function requestDeviceChange() {
    setRequestingDevice(true);
    setError("");
    try {
      const response = await api.post(
        `/schools/${schoolId}/hr/attendance/device-requests`,
        { device_id: getStaffDeviceId() },
      );
      setDeviceMismatch(false);
      setSuccess(response.data?.message || "Demande envoyée à la RH.");
      await loadStatus();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible d’envoyer la demande."));
    } finally {
      setRequestingDevice(false);
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Pointage du personnel
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Scannez le QR affiché à l’administration pour enregistrer votre
        arrivée ou votre départ. Utilisez toujours le même téléphone
        {status?.gps_required ? ", activez la localisation" : ""} et soyez
        connecté au Wi-Fi du bureau si l’école l’exige.
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
      {deviceMismatch && !status?.device_request_pending && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={requestDeviceChange}
              disabled={requestingDevice}
            >
              {requestingDevice ? "Envoi..." : "Utiliser ce téléphone"}
            </Button>
          }
        >
          Vous avez changé de téléphone ? Demandez à la RH d’autoriser celui-ci.
        </Alert>
      )}
      {status?.device_request_pending && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Votre demande de changement de téléphone est en attente de
          validation par la RH.
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
            {submitting && (
              <Typography color="primary" sx={{ mb: 1 }}>
                Enregistrement du pointage...
              </Typography>
            )}
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
