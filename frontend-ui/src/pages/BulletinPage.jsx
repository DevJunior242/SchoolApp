import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { asArray, getApiErrorMessage } from "../utils/apiData.js";
import {
  bulletinColumns,
  bulletinFileName,
  bulletinSummary,
  bulletinTitle,
  downloadBulletinsPdf,
  generalAppreciation,
} from "../utils/bulletinPdf.js";

export default function BulletinPage({ studentId: studentIdProp = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { studentId: routeStudentId } = useParams();
  const studentId = studentIdProp ?? routeStudentId;
  const { data: seasons } = useApiGet(
    user.current_school_id
      ? `/schools/${user.current_school_id}/seasons`
      : null,
  );
  const [seasonId, setSeasonId] = useState("");
  const [bulletin, setBulletin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(
          `/schools/${user.current_school_id}/students/${studentId}/bulletin`,
          { params: seasonId ? { season_id: seasonId } : {} },
        );
        if (!cancelled) setBulletin(response.data);
      } catch (requestError) {
        if (!cancelled) {
          setBulletin(null);
          setError(getApiErrorMessage(requestError, "Impossible de charger le bulletin."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user.current_school_id, studentId, seasonId]);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadBulletinsPdf([bulletin], bulletinFileName(bulletin));
    } finally {
      setDownloading(false);
    }
  }

  const template = bulletin?.template ?? {};
  const subjects = asArray(bulletin?.subjects);
  const columns = bulletinColumns(template, subjects);
  const appreciation = generalAppreciation(bulletin);

  return (
    <Box>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ← Retour
      </Button>

      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}
      >
        <Typography variant="h5" fontWeight={700}>
          Bulletin{bulletin ? ` — ${bulletin.student?.fullname}` : ""}
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={!bulletin || downloading}
        >
          {downloading ? "Préparation..." : "Télécharger (PDF)"}
        </Button>
      </Stack>

      <TextField
        select
        label="Période"
        value={seasonId}
        onChange={(e) => setSeasonId(e.target.value)}
        sx={{ mb: 3, maxWidth: 280 }}
        fullWidth
      >
        <MenuItem value="">Année complète</MenuItem>
        {asArray(seasons).map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.label}
          </MenuItem>
        ))}
      </TextField>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {bulletin && !loading && (
        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ alignItems: { sm: "center" }, mb: 2 }}
            >
              {bulletin.school?.logo_url && (
                <Box
                  component="img"
                  src={bulletin.school.logo_url}
                  alt=""
                  sx={{ width: 64, height: 64, objectFit: "contain" }}
                />
              )}
              <Box sx={{ flex: 1, textAlign: { sm: "center" } }}>
                {asArray(template.header_lines).map((line) => (
                  <Typography key={line} variant="caption" display="block" color="text.secondary">
                    {line}
                  </Typography>
                ))}
                <Typography variant="h6" fontWeight={700}>
                  {bulletin.school?.name}
                </Typography>
                {template.motto && (
                  <Typography variant="caption" color="text.secondary">
                    {template.motto}
                  </Typography>
                )}
              </Box>
            </Stack>

            <Typography variant="subtitle1" fontWeight={700} sx={{ textAlign: "center", mb: 2 }}>
              {bulletinTitle(bulletin)} — {bulletin.period_label}
            </Typography>

            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 2 }}>
              <Chip size="small" variant="outlined" label={`Classe : ${bulletin.class?.name ?? "—"}`} />
              {bulletin.class?.head_teacher && (
                <Chip size="small" variant="outlined" label={`Titulaire : ${bulletin.class.head_teacher}`} />
              )}
              <Chip size="small" variant="outlined" label={`Année : ${bulletin.school_year ?? "—"}`} />
              {bulletin.student?.matricule && (
                <Chip size="small" variant="outlined" label={`Matricule : ${bulletin.student.matricule}`} />
              )}
            </Stack>

            <Box sx={{ overflowX: "auto", mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell key={column.key} align={column.align ?? "left"}>
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.subject}>
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          align={column.align ?? "left"}
                          sx={column.key === "average" ? { fontWeight: 700 } : undefined}
                        >
                          {column.value(subject)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {subjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center">
                        Aucune matière enseignée pour l'instant.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>

            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
              {bulletinSummary(bulletin).map(([label, value]) => (
                <Chip
                  key={label}
                  label={`${label} : ${value}`}
                  color={
                    label === "Décision"
                      ? bulletin.passed
                        ? "success"
                        : "error"
                      : label === "Moyenne générale"
                        ? "primary"
                        : "default"
                  }
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>

            {appreciation && (
              <Box sx={{ mt: 2, p: 2, borderRadius: 1, bgcolor: "action.hover" }}>
                <Typography variant="subtitle2" gutterBottom>
                  Appréciation générale{bulletin.class?.head_teacher ? ` — ${bulletin.class.head_teacher}` : ""}
                </Typography>
                <Typography>{appreciation}</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
