import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import EditIcon from "@mui/icons-material/Edit";
import PrintIcon from "@mui/icons-material/Print";
import PhonelinkEraseIcon from "@mui/icons-material/PhonelinkErase";
import api from "../api/axios.jsx";
import { asArray, asObject, getApiErrorMessage } from "../utils/apiData.js";
import { useAuth } from "../context/AuthContext.jsx";
import StaffAttendanceSettingsCard from "../components/StaffAttendanceSettingsCard.jsx";
import KioskLinkCard from "../components/KioskLinkCard.jsx";

const PUNCH_RESULT_LABELS = {
  check_in: "Arrivée",
  check_out: "Départ",
  rejected: "Refusé",
};

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}

const today = () => new Date().toISOString().slice(0, 10);

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("fr-FR") : "-";
}

export default function DashboardHrAttendancePage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const [date, setDate] = useState(today());
  const [records, setRecords] = useState([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrExpiresAt, setQrExpiresAt] = useState(null);
  const [settings, setSettings] = useState(null);
  const [printedQr, setPrintedQr] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceRequests, setDeviceRequests] = useState([]);
  const [togglingEmergency, setTogglingEmergency] = useState(false);
  const [punches, setPunches] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [correction, setCorrection] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    check_in: "",
    check_out: "",
    reason: "",
  });

  const printedMode = settings?.qr_mode === "printed";

  async function loadRecords() {
    if (!schoolId) return;
    const response = await api.get(`/schools/${schoolId}/hr/attendance`, {
      params: { date },
    });
    setRecords(asArray(response.data));
  }

  async function loadDevices() {
    const [devicesResponse, requestsResponse] = await Promise.all([
      api.get(`/schools/${schoolId}/hr/attendance/devices`),
      api.get(`/schools/${schoolId}/hr/attendance/device-requests`),
    ]);
    setDevices(asArray(devicesResponse.data));
    setDeviceRequests(asArray(requestsResponse.data));
  }

  async function reviewDeviceRequest(deviceRequest, decision) {
    setError("");
    try {
      const response = await api.post(
        `/schools/${schoolId}/hr/attendance/device-requests/${deviceRequest.id}/review`,
        { decision },
      );
      setSuccess(response.data?.message || "Demande traitée.");
      await loadDevices();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible de traiter la demande."));
    }
  }

  async function toggleEmergency(enabled) {
    if (
      enabled &&
      !window.confirm(
        "Activer le mode secours ? Le Wi-Fi du bureau ne sera plus vérifié jusqu’à ce soir minuit. Les pointages seront signalés.",
      )
    )
      return;
    setTogglingEmergency(true);
    setError("");
    try {
      const response = await api.post(`/schools/${schoolId}/hr/attendance/emergency`, {
        enabled,
      });
      setSettings(asObject(response.data));
      setSuccess(
        enabled
          ? "Mode secours activé jusqu’à ce soir minuit."
          : "Mode secours désactivé : le Wi-Fi du bureau est de nouveau vérifié.",
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible de changer le mode secours."));
    } finally {
      setTogglingEmergency(false);
    }
  }

  async function renderPrintedQr(data) {
    const dataUrl = await QRCode.toDataURL(data.token, { width: 600, margin: 2 });
    setPrintedQr({ ...data, dataUrl });
  }

  async function regeneratePrintedQr() {
    if (
      !window.confirm(
        "L’ancien QR imprimé ne fonctionnera plus. Il faudra imprimer et coller le nouveau. Continuer ?",
      )
    )
      return;
    setError("");
    try {
      const response = await api.post(`/schools/${schoolId}/hr/attendance/printed-qr`);
      await renderPrintedQr(asObject(response.data));
      setSuccess("Nouveau QR généré. Imprimez-le et remplacez l’ancien.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible de générer le QR."));
    }
  }

  function printQr() {
    if (!printedQr) return;
    const schoolName = escapeHtml(printedQr.school_name || "");
    const popup = window.open("", "_blank", "width=800,height=1000");
    if (!popup) {
      setError("Autorisez les fenêtres pop-up pour imprimer le QR.");
      return;
    }
    popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>QR de pointage - ${schoolName}</title>
<style>body{font-family:Arial,sans-serif;text-align:center;padding:40px}
h1{font-size:32px;margin:0 0 8px}h2{font-size:22px;font-weight:normal;margin:0 0 24px}
img{width:420px;height:420px}p{font-size:18px}</style></head><body>
<h1>${schoolName}</h1><h2>Pointage du personnel</h2>
<img src="${printedQr.dataUrl}" alt="QR de pointage">
<p>Ouvrez l’application, menu <strong>Pointage</strong>, puis scannez ce QR<br>
avec votre propre téléphone, connecté au Wi-Fi du bureau.</p>
</body></html>`);
    popup.document.close();
    popup.onload = () => popup.print();
  }

  async function resetDevice(device) {
    if (
      !window.confirm(
        `Réinitialiser le téléphone de ${device.user?.fullname} ? Le prochain téléphone utilisé pour pointer sera enregistré.`,
      )
    )
      return;
    setError("");
    try {
      const response = await api.delete(
        `/schools/${schoolId}/hr/attendance/devices/${device.user_id}`,
      );
      setSuccess(response.data?.message || "Téléphone réinitialisé.");
      await loadDevices();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible de réinitialiser le téléphone."));
    }
  }

  async function generateQr() {
    if (!schoolId) return;
    const response = await api.post(`/schools/${schoolId}/hr/attendance/qr`);
    const dataUrl = await QRCode.toDataURL(response.data.token, {
      width: 280,
      margin: 2,
    });
    setQrDataUrl(dataUrl);
    setQrExpiresAt(response.data.expires_at);
  }

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/schools/${schoolId}/hr/attendance`, { params: { date } })
      .then((response) => {
        if (!cancelled) setRecords(asArray(response.data));
      })
      .catch((requestError) => {
        if (!cancelled)
          setError(
            getApiErrorMessage(requestError, "Impossible de charger les présences."),
          );
      });
    api
      .get(`/schools/${schoolId}/hr/attendance/punches`, { params: { date } })
      .then((response) => {
        if (!cancelled) setPunches(asArray(response.data));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [schoolId, date]);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    Promise.all([
      api.get(`/schools/${schoolId}/hr/attendance/settings`),
      api.get(`/schools/${schoolId}/hr/attendance/devices`),
      api.get(`/schools/${schoolId}/hr/attendance/device-requests`),
    ])
      .then(([settingsResponse, devicesResponse, requestsResponse]) => {
        if (cancelled) return;
        setSettings(asObject(settingsResponse.data));
        setDevices(asArray(devicesResponse.data));
        setDeviceRequests(asArray(requestsResponse.data));
      })
      .catch((requestError) => {
        if (!cancelled)
          setError(
            getApiErrorMessage(requestError, "Impossible de charger les règles de pointage."),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !printedMode || !settings?.has_printed_token) return;
    let cancelled = false;
    api
      .get(`/schools/${schoolId}/hr/attendance/printed-qr`)
      .then(async (response) => {
        const data = asObject(response.data);
        const dataUrl = await QRCode.toDataURL(data.token, { width: 600, margin: 2 });
        if (!cancelled) setPrintedQr({ ...data, dataUrl });
      })
      .catch((requestError) => {
        if (!cancelled)
          setError(getApiErrorMessage(requestError, "Impossible de charger le QR imprimé."));
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId, printedMode, settings?.has_printed_token]);

  useEffect(() => {
    if (!schoolId || !settings || printedMode) return;
    let cancelled = false;
    const refreshQr = () => {
      api
        .post(`/schools/${schoolId}/hr/attendance/qr`)
        .then(async (response) => {
          const dataUrl = await QRCode.toDataURL(response.data.token, {
            width: 280,
            margin: 2,
          });
          if (!cancelled) {
            setQrDataUrl(dataUrl);
            setQrExpiresAt(response.data.expires_at);
          }
        })
        .catch((requestError) => {
          if (!cancelled)
            setError(
              getApiErrorMessage(requestError, "Impossible de générer le QR code."),
            );
        });
    };
    refreshQr();
    const interval = setInterval(() => {
      refreshQr();
    }, 25000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [schoolId, settings, printedMode]);

  function openCorrection(record) {
    setCorrection(record);
    setCorrectionForm({
      check_in: record.check_in ? record.check_in.slice(0, 16) : "",
      check_out: record.check_out ? record.check_out.slice(0, 16) : "",
      reason: "",
    });
  }

  async function saveCorrection(event) {
    event.preventDefault();
    setError("");
    try {
      await api.put(
        `/schools/${schoolId}/hr/attendance/${correction.id}/correction`,
        correctionForm,
      );
      setSuccess("Présence corrigée avec traçabilité.");
      setCorrection(null);
      await loadRecords();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible de corriger la présence."));
    }
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Présence du personnel
          </Typography>
          <Typography color="text.secondary">
            Pointage QR contrôlé (Wi-Fi, téléphone, GPS) et corrections RH
            traçables.
          </Typography>
        </Box>
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}
      {settings?.network_check_enabled &&
        (settings.emergency_active ? (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => toggleEmergency(false)}
                disabled={togglingEmergency}
              >
                Désactiver
              </Button>
            }
          >
            Mode secours actif jusqu’à {formatDateTime(settings.emergency_until)} :
            le Wi-Fi du bureau n’est pas vérifié, les pointages sont signalés.
          </Alert>
        ) : (
          <Box sx={{ mb: 2 }}>
            <Button
              color="warning"
              variant="outlined"
              onClick={() => toggleEmergency(true)}
              disabled={togglingEmergency}
            >
              Wi-Fi en panne ? Activer le mode secours
            </Button>
          </Box>
        ))}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
        <Card
          variant="outlined"
          sx={{ p: 2, width: { xs: "100%", md: 340 }, textAlign: "center" }}
        >
          {printedMode ? (
            <>
              <Typography variant="h6">QR imprimé</Typography>
              {printedQr?.dataUrl && (
                <Box
                  component="img"
                  src={printedQr.dataUrl}
                  alt="QR de pointage imprimé"
                  sx={{ width: 240, height: 240, my: 1 }}
                />
              )}
              <Typography variant="caption" display="block" color="text.secondary">
                QR fixe à imprimer et coller à l’administration
              </Typography>
              {printedQr?.generated_at && (
                <Typography variant="caption" color="text.secondary">
                  Généré le {formatDateTime(printedQr.generated_at)}
                </Typography>
              )}
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
                <Button startIcon={<PrintIcon />} onClick={printQr} disabled={!printedQr}>
                  Imprimer
                </Button>
                <Button startIcon={<QrCode2Icon />} onClick={regeneratePrintedQr} color="warning">
                  Nouveau QR
                </Button>
              </Stack>
            </>
          ) : (
            <>
              <Typography variant="h6">QR de pointage</Typography>
              {qrDataUrl && (
                <Box
                  component="img"
                  src={qrDataUrl}
                  alt="QR de pointage"
                  sx={{ width: 240, height: 240, my: 1 }}
                />
              )}
              <Typography variant="caption" display="block" color="text.secondary">
                Renouvelé automatiquement toutes les 25 secondes
              </Typography>
              {qrExpiresAt && (
                <Typography variant="caption" color="text.secondary">
                  Expire à {formatDateTime(qrExpiresAt)}
                </Typography>
              )}
              <Button
                startIcon={<QrCode2Icon />}
                onClick={generateQr}
                sx={{ mt: 1 }}
              >
                Renouveler
              </Button>
            </>
          )}
        </Card>

        <TableContainer component={Card} variant="outlined" sx={{ flex: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employé</TableCell>
                <TableCell>Arrivée</TableCell>
                <TableCell>Départ</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Contrôle</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record) => (
                <TableRow hover key={record.id}>
                  <TableCell>{record.user?.fullname || "-"}</TableCell>
                  <TableCell>{formatDateTime(record.check_in)}</TableCell>
                  <TableCell>{formatDateTime(record.check_out)}</TableCell>
                  <TableCell>
                    {record.check_in_source || record.check_out_source || "-"}
                  </TableCell>
                  <TableCell>
                    {record.flag_labels?.length ? (
                      <Tooltip title={record.flag_labels.join(" · ")}>
                        <Chip size="small" color="warning" label="Suspect" />
                      </Tooltip>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => openCorrection(record)}
                    >
                      Corriger
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">
                      Aucun pointage pour cette date.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Typography variant="h6" gutterBottom>
        Tentatives de pointage du jour
      </Typography>
      <TableContainer component={Card} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Heure</TableCell>
              <TableCell>Employé</TableCell>
              <TableCell>Résultat</TableCell>
              <TableCell>Détail</TableCell>
              <TableCell>Réseau</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {punches.map((punch) => (
              <TableRow hover key={punch.id}>
                <TableCell>{formatDateTime(punch.created_at)}</TableCell>
                <TableCell>{punch.user?.fullname || "-"}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={punch.result === "rejected" ? "error" : "success"}
                    label={PUNCH_RESULT_LABELS[punch.result] || punch.result}
                  />
                </TableCell>
                <TableCell>
                  {punch.rejection_reason ||
                    punch.flag_labels?.join(" · ") ||
                    (punch.distance_meters != null
                      ? `À ${punch.distance_meters} m du bureau`
                      : "-")}
                </TableCell>
                <TableCell>{punch.ip_address || "-"}</TableCell>
              </TableRow>
            ))}
            {punches.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">
                    Aucune tentative de pointage pour cette date.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {settings && !printedMode && <KioskLinkCard schoolId={schoolId} />}

      {settings && (
        <StaffAttendanceSettingsCard
          key={settings.updated_at || "new"}
          schoolId={schoolId}
          settings={settings}
          onSaved={setSettings}
        />
      )}

      {deviceRequests.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            Demandes de changement de téléphone
          </Typography>
          <TableContainer component={Card} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employé</TableCell>
                  <TableCell>Demandé le</TableCell>
                  <TableCell>Nouveau téléphone</TableCell>
                  <TableCell align="right">Décision</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deviceRequests.map((deviceRequest) => (
                  <TableRow hover key={deviceRequest.id}>
                    <TableCell>{deviceRequest.user?.fullname || "-"}</TableCell>
                    <TableCell>{formatDateTime(deviceRequest.updated_at)}</TableCell>
                    <TableCell sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {deviceRequest.user_agent || "-"}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => reviewDeviceRequest(deviceRequest, "approve")}
                        >
                          Autoriser
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => reviewDeviceRequest(deviceRequest, "reject")}
                        >
                          Refuser
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Typography variant="h6" gutterBottom>
        Téléphones enregistrés
      </Typography>
      <TableContainer component={Card} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employé</TableCell>
              <TableCell>Enregistré le</TableCell>
              <TableCell>Appareil</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.map((device) => (
              <TableRow hover key={device.id}>
                <TableCell>{device.user?.fullname || "-"}</TableCell>
                <TableCell>{formatDateTime(device.bound_at)}</TableCell>
                <TableCell sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {device.user_agent || "-"}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    color="warning"
                    startIcon={<PhonelinkEraseIcon />}
                    onClick={() => resetDevice(device)}
                  >
                    Réinitialiser
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">
                    Aucun téléphone enregistré. Chaque téléphone est enregistré
                    au premier pointage quand le contrôle est activé.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={Boolean(correction)}
        onClose={() => setCorrection(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Corriger la présence de {correction?.user?.fullname}
        </DialogTitle>
        <Box component="form" onSubmit={saveCorrection}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Arrivée"
              type="datetime-local"
              value={correctionForm.check_in}
              onChange={(event) =>
                setCorrectionForm((form) => ({
                  ...form,
                  check_in: event.target.value,
                }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Départ"
              type="datetime-local"
              value={correctionForm.check_out}
              onChange={(event) =>
                setCorrectionForm((form) => ({
                  ...form,
                  check_out: event.target.value,
                }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Motif obligatoire"
              value={correctionForm.reason}
              onChange={(event) =>
                setCorrectionForm((form) => ({
                  ...form,
                  reason: event.target.value,
                }))
              }
              required
              multiline
              minRows={3}
              placeholder="Ex. téléphone indisponible"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCorrection(null)}>Annuler</Button>
            <Button type="submit" variant="contained">
              Enregistrer
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
