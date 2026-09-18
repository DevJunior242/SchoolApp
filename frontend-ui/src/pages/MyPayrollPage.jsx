import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const monthNow = () => new Date().toISOString().slice(0, 7);

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function MyPayrollPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const [period, setPeriod] = useState(monthNow());
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!schoolId || !user?.id) return;

    let cancelled = false;

    const fetchPayroll = async () => {
      try {
        const response = await api.get(
          `/schools/${schoolId}/payroll/${user.id}/summary`,
          {
            params: { period },
          },
        );

        if (!cancelled) {
          setSummary(response.data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.response?.data?.message ||
              "Impossible de charger votre paie.",
          );
        }
      }
    };

    fetchPayroll();
    return () => {
      cancelled = true;
    };
  }, [schoolId, user?.id, period]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Ma paie
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Consultez vos gains, retenues et net à payer pour le mois sélectionné.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, maxWidth: 260 }}>
        <FormControl fullWidth>
          <InputLabel>Période</InputLabel>
          <Select
            value={period}
            label="Période"
            onChange={(event) => setPeriod(event.target.value)}
          >
            {[0, 1, 2, 3, 4, 5].map((shift) => {
              const date = new Date();
              date.setMonth(date.getMonth() - shift);
              const value = date.toISOString().slice(0, 7);
              return (
                <MenuItem key={value} value={value}>
                  {new Date(`${value}-01`).toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric",
                  })}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Box>

      {summary && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total gains
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {formatMoney(summary.gains)}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total retenues
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {formatMoney(summary.retenues)}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Net à payer
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {formatMoney(summary.net)}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      )}

      {summary && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TableContainer component={Card} variant="outlined" sx={{ flex: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Gains</TableCell>
                  <TableCell>Montant</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.entries.filter((entry) => entry.type?.kind === "gain")
                  .length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography color="text.secondary">
                        Aucun gain pour cette période.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.entries
                    .filter((entry) => entry.type?.kind === "gain")
                    .map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.label || entry.type?.name}</TableCell>
                        <TableCell>{formatMoney(entry.amount)}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TableContainer component={Card} variant="outlined" sx={{ flex: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Retenues</TableCell>
                  <TableCell>Montant</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.entries.filter(
                  (entry) => entry.type?.kind === "retention",
                ).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography color="text.secondary">
                        Aucune retenue pour cette période.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.entries
                    .filter((entry) => entry.type?.kind === "retention")
                    .map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.label || entry.type?.name}</TableCell>
                        <TableCell>{formatMoney(entry.amount)}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
    </Box>
  );
}
