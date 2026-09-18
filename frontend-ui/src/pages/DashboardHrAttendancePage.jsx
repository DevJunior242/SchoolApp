import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Alert,
  Box,
  Button,
  Card,
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
  Typography,
} from "@mui/material";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import EditIcon from "@mui/icons-material/Edit";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";

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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [correction, setCorrection] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    check_in: "",
    check_out: "",
    reason: "",
  });

  async function loadRecords() {
    if (!schoolId) return;
    const response = await api.get(`/schools/${schoolId}/hr/attendance`, {
      params: { date },
    });
    setRecords(response.data ?? []);
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
        if (!cancelled) setRecords(response.data ?? []);
      })
      .catch((requestError) => {
        if (!cancelled)
          setError(
            requestError.response?.data?.message ||
              "Impossible de charger les présences.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId, date]);

  useEffect(() => {
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
              requestError.response?.data?.message ||
                "Impossible de générer le QR code.",
            );
        });
    };
    refreshQr();
    const interval = setInterval(() => {
      refreshQr();
    }, 55000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [schoolId]);

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
      const messages = requestError.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : requestError.response?.data?.message ||
              "Impossible de corriger la présence.",
      );
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
            Pointage QR dynamique et corrections RH traçables.
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

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
        <Card
          variant="outlined"
          sx={{ p: 2, width: { xs: "100%", md: 340 }, textAlign: "center" }}
        >
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
            Renouvelé automatiquement toutes les 60 secondes
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
        </Card>

        <TableContainer component={Card} variant="outlined" sx={{ flex: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employé</TableCell>
                <TableCell>Arrivée</TableCell>
                <TableCell>Départ</TableCell>
                <TableCell>Source</TableCell>
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
                  <TableCell colSpan={5}>
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
