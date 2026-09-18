import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
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

export default function DashboardPayrollPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const [staff, setStaff] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [period, setPeriod] = useState(monthNow());
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({
    name: "",
    code: "",
    kind: "gain",
    description: "",
  });
  const [entryForm, setEntryForm] = useState({
    type_id: "",
    label: "",
    amount: "",
    note: "",
  });

  async function loadTypes() {
    if (!schoolId) return;
    const response = await api.get(`/schools/${schoolId}/payroll/types`);
    setTypes(response.data ?? []);
    if (response.data?.[0]) {
      setEntryForm((prev) => ({ ...prev, type_id: response.data[0].id }));
    }
  }

  async function loadSummary() {
    if (!schoolId || !selectedUserId) return;
    const response = await api.get(
      `/schools/${schoolId}/payroll/${selectedUserId}/summary`,
      {
        params: { period },
      },
    );
    setSummary(response.data);
  }

  useEffect(() => {
    let cancelled = false;

    const fetchInitialData = async () => {
      if (!schoolId) return;

      try {
        const employees = await api.get(`/schools/${schoolId}/hr/staff`, {
          params: { per_page: 100 },
        });
        const payrollTypes = await api.get(
          `/schools/${schoolId}/payroll/types`,
        );

        if (!cancelled) {
          setStaff(employees.data?.data ?? []);
          setTypes(payrollTypes.data ?? []);
          if (payrollTypes.data?.[0]) {
            setEntryForm((prev) => ({
              ...prev,
              type_id: payrollTypes.data[0].id,
            }));
          }
        }
      } catch (requestError) {
        if (!cancelled)
          setError(
            requestError.response?.data?.message ||
              "Impossible de charger la paie.",
          );
      }
    };

    fetchInitialData();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  useEffect(() => {
    if (!selectedUserId || !schoolId) return;

    let cancelled = false;

    const fetchSummary = async () => {
      try {
        const response = await api.get(
          `/schools/${schoolId}/payroll/${selectedUserId}/summary`,
          {
            params: { period },
          },
        );

        if (!cancelled) setSummary(response.data);
      } catch (requestError) {
        if (!cancelled)
          setError(
            requestError.response?.data?.message ||
              "Impossible de charger le résumé de paie.",
          );
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [selectedUserId, period, schoolId]);

  async function saveType(event) {
    event.preventDefault();
    setError("");
    try {
      if (editingType) {
        await api.put(
          `/schools/${schoolId}/payroll/types/${editingType.id}`,
          typeForm,
        );
      } else {
        await api.post(`/schools/${schoolId}/payroll/types`, typeForm);
      }
      setSuccess("Type de paie enregistré.");
      setTypeForm({
        name: "",
        code: "",
        kind: "gain",
        description: "",
      });
      setEditingType(null);
      setTypeModalOpen(false);
      await loadTypes();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Impossible d’enregistrer le type.",
      );
    }
  }

  async function deleteType(type) {
    if (!window.confirm(`Supprimer le type “${type.name}” ?`)) return;
    try {
      await api.delete(`/schools/${schoolId}/payroll/types/${type.id}`);
      setSuccess("Type supprimé.");
      await loadTypes();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Impossible de supprimer ce type de paie.",
      );
    }
  }

  async function saveEntry(event) {
    event.preventDefault();
    setError("");
    try {
      await api.post(`/schools/${schoolId}/payroll/${selectedUserId}/entries`, {
        ...entryForm,
        period,
      });
      setSuccess("Ligne de paie ajoutée.");
      setEntryForm({
        type_id: types[0]?.id ?? "",
        label: "",
        amount: "",
        note: "",
      });
      setEntryModalOpen(false);
      await loadSummary();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Impossible d’ajouter la ligne de paie.",
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
            Paie configurable
          </Typography>
          <Typography color="text.secondary">
            Gains, retenues et net à payer, sans codage statique.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setTypeModalOpen(true)}>
            Type de paie
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEntryModalOpen(true)}
            disabled={!selectedUserId}
          >
            Ajouter une ligne
          </Button>
        </Stack>
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
        <TextField
          label="Période"
          type="month"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        />
        <FormControl sx={{ minWidth: 260 }}>
          <InputLabel>Employé</InputLabel>
          <Select
            value={selectedUserId}
            label="Employé"
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            {staff.map((person) => (
              <MenuItem key={person.user_id} value={person.user_id}>
                {person.fullname || person.user?.fullname || "Employé"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Types de paie
          </Typography>

          {types.length === 0 ? (
            <Typography color="text.secondary">
              Aucun type configuré.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {types.map((type) => (
                <Card key={type.id} variant="outlined" sx={{ p: 0 }}>
                  <CardContent sx={{ p: 1.5, pb: "12px !important" }}>
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                      >
                        <Typography fontWeight={700}>{type.name}</Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: 999,
                            bgcolor:
                              type.kind === "gain"
                                ? "success.light"
                                : "warning.light",
                            color: "text.primary",
                          }}
                        >
                          {type.kind === "gain" ? "Gain" : "Retenue"}
                        </Typography>
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        Code : {type.code}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Description : {type.description || "—"}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setEditingType(type);
                            setTypeForm({
                              name: type.name,
                              code: type.code,
                              kind: type.kind,
                              description: type.description || "",
                            });
                            setTypeModalOpen(true);
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => deleteType(type)}
                        >
                          Supprimer
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

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
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Gains
              </Typography>

              {summary.entries.filter((entry) => entry.type?.kind === "gain")
                .length === 0 ? (
                <Typography color="text.secondary">
                  Aucun gain pour cette période.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {summary.entries
                    .filter((entry) => entry.type?.kind === "gain")
                    .map((entry) => (
                      <Box
                        key={entry.id}
                        sx={{
                          p: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={2}
                        >
                          <Typography fontWeight={600}>
                            {entry.label || entry.type?.name}
                          </Typography>
                          <Typography color="success.main" fontWeight={700}>
                            {formatMoney(entry.amount)}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Retenues
              </Typography>

              {summary.entries.filter(
                (entry) => entry.type?.kind === "retention",
              ).length === 0 ? (
                <Typography color="text.secondary">
                  Aucune retenue pour cette période.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {summary.entries
                    .filter((entry) => entry.type?.kind === "retention")
                    .map((entry) => (
                      <Box
                        key={entry.id}
                        sx={{
                          p: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={2}
                        >
                          <Typography fontWeight={600}>
                            {entry.label || entry.type?.name}
                          </Typography>
                          <Typography color="warning.main" fontWeight={700}>
                            {formatMoney(entry.amount)}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      <Dialog
        open={typeModalOpen}
        onClose={() => {
          setTypeModalOpen(false);
          setEditingType(null);
          setTypeForm({ name: "", code: "", kind: "gain", description: "" });
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingType ? "Modifier le type de paie" : "Ajouter un type de paie"}
        </DialogTitle>
        <Box component="form" onSubmit={saveType}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Nom"
              value={typeForm.name}
              onChange={(event) =>
                setTypeForm((form) => ({ ...form, name: event.target.value }))
              }
              required
              fullWidth
            />
            <TextField
              label="Code"
              value={typeForm.code}
              onChange={(event) =>
                setTypeForm((form) => ({ ...form, code: event.target.value }))
              }
              required
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeForm.kind}
                label="Type"
                onChange={(event) =>
                  setTypeForm((form) => ({ ...form, kind: event.target.value }))
                }
              >
                <MenuItem value="gain">Gain</MenuItem>
                <MenuItem value="retention">Retenue</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Montant par défaut"
              type="number"
              value={typeForm.default_amount}
              onChange={(event) =>
                setTypeForm((form) => ({
                  ...form,
                  default_amount: event.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="Description"
              multiline
              minRows={2}
              value={typeForm.description}
              onChange={(event) =>
                setTypeForm((form) => ({
                  ...form,
                  description: event.target.value,
                }))
              }
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTypeModalOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained">
              Enregistrer
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Ajouter une ligne de paie</DialogTitle>
        <Box component="form" onSubmit={saveEntry}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={entryForm.type_id}
                onChange={(event) =>
                  setEntryForm((form) => ({
                    ...form,
                    type_id: event.target.value,
                  }))
                }
              >
                {types.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name} ({type.kind})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Libellé"
              value={entryForm.label}
              onChange={(event) =>
                setEntryForm((form) => ({ ...form, label: event.target.value }))
              }
              required
              fullWidth
            />
            <TextField
              label="Montant"
              type="number"
              value={entryForm.amount}
              onChange={(event) =>
                setEntryForm((form) => ({
                  ...form,
                  amount: event.target.value,
                }))
              }
              required
              fullWidth
            />
            <TextField
              label="Note"
              multiline
              minRows={2}
              value={entryForm.note}
              onChange={(event) =>
                setEntryForm((form) => ({ ...form, note: event.target.value }))
              }
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEntryModalOpen(false)}>Annuler</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!selectedUserId}
            >
              Enregistrer
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
