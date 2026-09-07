import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.jsx";

const initialForm = {
  user_id: "",
  department: "",
  position: "",
  employment_status: 1,
  hire_date: "",
  monthly_salary: "",
  contract_type: 1,
};

const initialLeaveForm = {
  user_id: "",
  leave_type: "",
  starts_on: "",
  ends_on: "",
  reason: "",
};

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 1, label: "Temps plein" },
  { value: 2, label: "Temps partiel" },
  { value: 3, label: "Contrat" },
  { value: 4, label: "Temporaire" },
];

const CONTRACT_TYPE_OPTIONS = [
  { value: 1, label: "CDI" },
  { value: 2, label: "CDD" },
  { value: 3, label: "Stage" },
  { value: 4, label: "Vacataire" },
];

const getEmploymentStatusLabel = (value) =>
  EMPLOYMENT_STATUS_OPTIONS.find((option) => option.value === Number(value))
    ?.label ?? "";

const getContractTypeLabel = (value) =>
  CONTRACT_TYPE_OPTIONS.find((option) => option.value === Number(value))
    ?.label ?? "";

export default function DashboardHrPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const [staff, setStaff] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalStaff, setTotalStaff] = useState(0);
  const [leaves, setLeaves] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [form, setForm] = useState(initialForm);
  const [leaveForm, setLeaveForm] = useState(initialLeaveForm);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  useEffect(() => {
    if (!schoolId) return;

    async function loadData() {
      try {
        const [membersRes, leavesRes] = await Promise.all([
          api.get(`/schools/${schoolId}/hr/staff`, { params: { per_page: 100 } }),
          api.get(`/schools/${schoolId}/hr/leaves`),
        ]);

        setLeaves(leavesRes.data || []);
        setMembers(
          (membersRes.data.data || []).map((member) => ({
            ...member,
            label: `${member.fullname || "Membre"} · ${member.role || "Rôle"}`,
          })),
        );
      } catch (err) {
        setError(
          err.response?.data?.message || "Impossible de charger le module RH.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [schoolId]);

  async function loadStaff() {
    const res = await api.get(`/schools/${schoolId}/hr/staff`, {
      params: {
        page,
        per_page: 10,
        search: searchTerm || undefined,
        department: departmentFilter === "all" ? undefined : departmentFilter,
      },
    });
    setStaff(res.data.data || []);
    setLastPage(res.data.last_page || 1);
    setTotalStaff(res.data.total || 0);
  }

  useEffect(() => {
    if (!schoolId) return;

    const timeout = setTimeout(() => {
      loadStaff().catch((err) =>
        setError(
          err.response?.data?.message || "Impossible de charger le personnel.",
        ),
      );
    }, 300);

    return () => clearTimeout(timeout);
  }, [schoolId, page, searchTerm, departmentFilter]);

  async function loadLeaves() {
    const res = await api.get(`/schools/${schoolId}/hr/leaves`);
    setLeaves(res.data || []);
  }

  const departments = [
    ...new Set(members.map((person) => person.department).filter(Boolean)),
  ].sort();
  const totalPayroll = members.reduce(
    (total, person) => total + Number(person.monthly_salary || 0),
    0,
  );
  const cdiCount = members.filter(
    (person) => Number(person.contract_type) === 1,
  ).length;
  const formatAmount = (amount) =>
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(amount);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!schoolId) return;

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        ...form,
        monthly_salary:
          form.monthly_salary === "" ? null : Number(form.monthly_salary),
      };

      if (editingUserId) {
        await api.put(
          `/schools/${schoolId}/hr/staff/${editingUserId}`,
          payload,
        );
      } else {
        await api.post(`/schools/${schoolId}/hr/staff`, {
          ...payload,
          user_id: form.user_id,
        });
      }

      await loadStaff();
      setForm(initialForm);
      setEditingUserId(null);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : err.response?.data?.message ||
              "Impossible d'enregistrer ce profil RH.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(member) {
    setEditingUserId(member.user_id);
    setForm({
      user_id: member.user_id || "",
      department: member.department || "",
      position: member.position || "",
      employment_status: member.employment_status ?? 1,
      hire_date: member.hire_date || "",
      monthly_salary: member.monthly_salary ?? "",
      contract_type: member.contract_type ?? 1,
    });
  }

  async function handleDelete(member) {
    if (!member.user_id || !window.confirm("Supprimer ce profil RH ?")) {
      return;
    }

    try {
      await api.delete(`/schools/${schoolId}/hr/staff/${member.user_id}`);
      await loadStaff();
      if (editingUserId === member.user_id) {
        setEditingUserId(null);
        setForm(initialForm);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Impossible de supprimer ce profil RH.",
      );
    }
  }

  async function handleLeaveSubmit(event) {
    event.preventDefault();
    if (!schoolId) return;

    setLeaveSubmitting(true);
    setError("");

    try {
      await api.post(`/schools/${schoolId}/hr/leaves`, {
        ...leaveForm,
      });
      await loadLeaves();
      setLeaveForm(initialLeaveForm);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : err.response?.data?.message ||
              "Impossible d'enregistrer cette demande de congé.",
      );
    } finally {
      setLeaveSubmitting(false);
    }
  }

  async function handleLeaveStatus(leave, status) {
    try {
      await api.put(`/schools/${schoolId}/hr/leaves/${leave.id}/status`, {
        status,
      });
      await loadLeaves();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Impossible de mettre à jour cette demande de congé.",
      );
    }
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3, gap: 2, flexWrap: "wrap" }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Ressources humaines
          </Typography>
          <Typography color="text.secondary">
            Suivi du personnel, contrats et informations RH.
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Personnel RH
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {totalStaff}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Départements
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {departments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Contrats CDI
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {cdiCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Masse salariale mensuelle
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {formatAmount(totalPayroll)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Personnel
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <TextField
                size="small"
                label="Rechercher"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                fullWidth
              />
              <TextField
                select
                size="small"
                label="Département"
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(1);
                }}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">Tous</MenuItem>
                {departments.map((department) => (
                  <MenuItem key={department} value={department}>
                    {department}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {loading ? (
              <Typography color="text.secondary">Chargement...</Typography>
            ) : staff.length === 0 ? (
              <Typography color="text.secondary">
                Aucun profil RH ne correspond à ces filtres.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {staff.map((member) => (
                  <Card key={member.id} variant="outlined">
                    <CardContent
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box>
                        <Typography fontWeight={700}>
                          {member.fullname}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {member.email || member.phone || "Aucun contact"}
                        </Typography>
                        {member.department || member.position ? (
                          <Typography variant="caption" color="text.secondary">
                            {member.department || "-"}
                            {member.department && member.position ? " · " : ""}
                            {member.position || ""}
                          </Typography>
                        ) : null}
                      </Box>
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        alignItems="center"
                      >
                        <Chip label={member.role || "Rôle"} size="small" />
                        {member.employment_status && (
                          <Chip
                            label={getEmploymentStatusLabel(
                              member.employment_status,
                            )}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        {member.contract_type && (
                          <Chip
                            label={getContractTypeLabel(member.contract_type)}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <IconButton
                          size="small"
                          aria-label="Modifier"
                          onClick={() => handleEdit(member)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label="Supprimer"
                          onClick={() => handleDelete(member)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
            {lastPage > 1 && (
              <Stack alignItems="center" sx={{ mt: 3 }}>
                <Pagination
                  count={lastPage}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {editingUserId ? "Modifier le profil RH" : "Ajouter un profil RH"}
            </Typography>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                select
                label="Membre"
                value={form.user_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, user_id: e.target.value }))
                }
                fullWidth
                required
              >
                {members.map((member) => (
                  <MenuItem
                    key={member.user_id || member.id}
                    value={member.user_id || member.id}
                  >
                    {member.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Département"
                placeholder="Ex. Comptabilité"
                value={form.department}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, department: e.target.value }))
                }
                fullWidth
              />

              <TextField
                label="Poste"
                placeholder="Ex. Comptable"
                value={form.position}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, position: e.target.value }))
                }
                fullWidth
              />

              <TextField
                select
                label="Statut"
                value={form.employment_status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    employment_status: Number(e.target.value),
                  }))
                }
                fullWidth
              >
                {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Date d'embauche"
                type="date"
                value={form.hire_date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, hire_date: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Salaire mensuel"
                placeholder="Ex. 250000"
                type="number"
                value={form.monthly_salary}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    monthly_salary: e.target.value,
                  }))
                }
                fullWidth
              />

              <TextField
                select
                label="Type de contrat"
                value={form.contract_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    contract_type: Number(e.target.value),
                  }))
                }
                fullWidth
              >
                {CONTRACT_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              {editingUserId && (
                <Button
                  type="button"
                  variant="text"
                  color="secondary"
                  onClick={() => {
                    setEditingUserId(null);
                    setForm(initialForm);
                  }}
                >
                  Annuler
                </Button>
              )}

              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting
                  ? "Enregistrement..."
                  : editingUserId
                    ? "Mettre à jour"
                    : "Enregistrer"}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Nouvelle demande de congé
            </Typography>
            <Box
              component="form"
              onSubmit={handleLeaveSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                select
                label="Personnel"
                value={leaveForm.user_id}
                onChange={(e) =>
                  setLeaveForm((prev) => ({ ...prev, user_id: e.target.value }))
                }
                required
                fullWidth
              >
                {staff.map((member) => (
                  <MenuItem key={member.user_id} value={member.user_id}>
                    {member.fullname}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Type de congé"
                placeholder="Ex. Congé familial"
                value={leaveForm.leave_type}
                onChange={(e) =>
                  setLeaveForm((prev) => ({
                    ...prev,
                    leave_type: e.target.value,
                  }))
                }
                required
                fullWidth
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Du"
                  type="date"
                  value={leaveForm.starts_on}
                  onChange={(e) =>
                    setLeaveForm((prev) => ({
                      ...prev,
                      starts_on: e.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />
                <TextField
                  label="Au"
                  type="date"
                  value={leaveForm.ends_on}
                  onChange={(e) =>
                    setLeaveForm((prev) => ({
                      ...prev,
                      ends_on: e.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />
              </Stack>
              <TextField
                label="Motif"
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                multiline
                minRows={3}
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                disabled={leaveSubmitting}
              >
                {leaveSubmitting
                  ? "Enregistrement..."
                  : "Enregistrer la demande"}
              </Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Demandes de congé
            </Typography>
            {leaves.length === 0 ? (
              <Typography color="text.secondary">
                Aucune demande de congé.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {leaves.map((leave) => (
                  <Card key={leave.id} variant="outlined">
                    <CardContent>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        spacing={2}
                      >
                        <Box>
                          <Typography fontWeight={700}>
                            {leave.fullname}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {leave.leave_type_label} · {leave.starts_on} au{" "}
                            {leave.ends_on}
                          </Typography>
                          {leave.reason && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {leave.reason}
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={leave.status_label}
                            color={
                              leave.status === 2
                                ? "success"
                                : leave.status === 3
                                  ? "error"
                                  : "warning"
                            }
                            size="small"
                          />
                          {leave.status === 1 && (
                            <>
                              <Button
                                size="small"
                                color="success"
                                onClick={() => handleLeaveStatus(leave, 2)}
                              >
                                Accepter
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleLeaveStatus(leave, 3)}
                              >
                                Refuser
                              </Button>
                            </>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
