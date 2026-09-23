import { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  IconButton,
  MenuItem,
  Menu,
  Pagination,
  Paper,
  Stack,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  InputAdornment,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.jsx";
import { useSchools } from "../hooks/useSchools.js";
import { useLocation } from "react-router-dom";
import InternationalPhoneField from "../components/InternationalPhoneField.jsx";
import QuickActions from "../components/QuickActions.jsx";

const initialForm = {
  user_id: "",
  department: "",
  position: "",
  employment_status: 1,
  hire_date: "",
  contract_start_date: "",
  contract_end_date: "",
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

const ROLE_BADGE_COLORS = {
  admin: "error",
  comptable: "success",
  secretaire: "info",
  censeur: "warning",
  surveillant: "warning",
  bibliothecaire: "secondary",
  infirmier: "error",
  professeur: "primary",
  enseignant: "primary",
};

const getRoleBadgeColor = (roleSlug) =>
  ROLE_BADGE_COLORS[roleSlug] ?? "default";

const formatDate = (value) => {
  if (!value) return "-";
  const datePart = String(value).split("T")[0];
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "-";
};

const toInputDate = (value) => (value ? String(value).split("T")[0] : "");

export default function DashboardHrPage() {
  const { user } = useAuth();
  const location = useLocation();
  const schoolId = user?.current_school_id;
  const isLeavesPage = location.pathname.endsWith("/hr/leaves");
  const { schoolUsers } = useSchools();
  const currentMembership = schoolUsers.find(
    (membership) => membership.school_id === schoolId,
  );
  const isHrOwner =
    currentMembership?.role?.slug === "rh" &&
    currentMembership?.is_owner === true;
  const isAdminOwner =
    currentMembership?.role?.slug === "admin" &&
    currentMembership?.is_owner === true;
  const canCreateRhAccount = isHrOwner || isAdminOwner;
  const schoolSections = currentMembership?.school?.sections ?? [];
  const [staff, setStaff] = useState([]);
  const [hrManagers, setHrManagers] = useState([]);
  const [hrManagerPage, setHrManagerPage] = useState(1);
  const [hrManagerLastPage, setHrManagerLastPage] = useState(1);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
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
  const [rhRoleId, setRhRoleId] = useState("");
  const [rhModalOpen, setRhModalOpen] = useState(false);
  const [rhForm, setRhForm] = useState({
    fullname: "",
    email: "",
    phone: "",
    section_ids: [],
  });
  const [rhPhoneError, setRhPhoneError] = useState("");
  const [actionAnchor, setActionAnchor] = useState(null);
  const [actionMember, setActionMember] = useState(null);

  // ✅ Modal states
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  useEffect(() => {
    if (!schoolId) return;

    async function loadData() {
      try {
        const [membersRes, managersRes, leavesRes, rolesRes] =
          await Promise.all([
            api.get(`/schools/${schoolId}/hr/staff`, {
              params: { per_page: 100 },
            }),
            api.get(`/schools/${schoolId}/hr/staff`, {
              params: { page: 1, per_page: 10, role: "rh" },
            }),
            api.get(`/schools/${schoolId}/hr/leaves`),
            api.get("/roles"),
          ]);

        setRhRoleId(rolesRes.data.find((role) => role.slug === "rh")?.id ?? "");

        setLeaves(leavesRes.data || []);
        setHrManagers(managersRes.data.data || []);
        setHrManagerLastPage(managersRes.data.last_page || 1);
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

  async function loadHrManagers(pageNumber = hrManagerPage) {
    const res = await api.get(`/schools/${schoolId}/hr/staff`, {
      params: { page: pageNumber, per_page: 10, role: "rh" },
    });
    setHrManagers(res.data.data || []);
    setHrManagerLastPage(res.data.last_page || 1);
  }

  const departments = [
    ...new Set(members.map((person) => person.department).filter(Boolean)),
  ].sort();
  // ✅ Close modals
  function closeStaffModal() {
    setStaffModalOpen(false);
    setEditingUserId(null);
    setForm(initialForm);
    setError("");
  }

  function closeLeaveModal() {
    setLeaveModalOpen(false);
    setLeaveForm(initialLeaveForm);
    setError("");
  }

  function openMemberActions(event, member) {
    setActionAnchor(event.currentTarget);
    setActionMember(member);
  }

  function closeMemberActions() {
    setActionAnchor(null);
    setActionMember(null);
  }

  function openLeaveForMember(member) {
    closeMemberActions();
    setLeaveForm((current) => ({
      ...current,
      user_id: member.user_id,
    }));
    setLeaveModalOpen(true);
  }

  function closeRhModal() {
    setRhModalOpen(false);
    setRhForm({ fullname: "", email: "", phone: "", section_ids: [] });
    setError("");
    setRhPhoneError("");
  }

  async function handleCreateRh(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.post(`/schools/${schoolId}/members`, {
        ...rhForm,
        role_id: rhRoleId,
      });
      closeRhModal();
      await loadStaff();
      await loadHrManagers();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : err.response?.data?.message || "Impossible de créer le compte RH.",
      );
      setRhPhoneError(messages?.phone?.[0] ?? "");
    } finally {
      setSubmitting(false);
    }
  }

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
      closeStaffModal();
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
      contract_start_date: toInputDate(member.contract_start_date),
      contract_end_date: toInputDate(member.contract_end_date),
      monthly_salary: member.monthly_salary ?? "",
      contract_type: member.contract_type ?? 1,
    });
    setStaffModalOpen(true);
  }

  async function handleDelete(member) {
    if (!member.user_id || !window.confirm("Supprimer ce profil RH ?")) {
      return;
    }

    try {
      await api.delete(`/schools/${schoolId}/hr/staff/${member.user_id}`);
      await loadStaff();
      if (editingUserId === member.user_id) {
        closeStaffModal();
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
      await api.post(`/schools/${schoolId}/hr/leaves`, leaveForm);
      await loadLeaves();
      closeLeaveModal();
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
            {isLeavesPage ? "Congés" : "Employés"}
          </Typography>
          <Typography color="text.secondary">
            {isLeavesPage
              ? "Consultez et traitez les demandes de congé du personnel."
              : "Suivi du personnel, contrats et informations RH."}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {!isLeavesPage && canCreateRhAccount && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setRhModalOpen(true)}
            >
              Ajouter un RH
            </Button>
          )}
          {!isLeavesPage && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setStaffModalOpen(true)}
            >
              Ajouter un profil
            </Button>
          )}
          {isLeavesPage && (
            <Button variant="contained" onClick={() => setLeaveModalOpen(true)}>
              Nouvelle demande
            </Button>
          )}
        </Stack>
      </Stack>

      {!isLeavesPage && <QuickActions role="rh" />}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Personnel List */}
        <Grid
          item
          xs={12}
          md={isLeavesPage ? 12 : 7}
          sx={{ display: isLeavesPage ? "none" : "block" }}
        >
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
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
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
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Employé</TableCell>
                      <TableCell>Rôle</TableCell>
                      <TableCell>Département</TableCell>
                      <TableCell>Sections</TableCell>
                      <TableCell>Contrat</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {staff.map((member) => (
                      <TableRow hover key={member.id}>
                        <TableCell>
                          <Typography fontWeight={700}>
                            {member.fullname}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.email || member.phone || "Aucun contact"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Chip
                              label={member.role || "Rôle"}
                              size="small"
                              color={getRoleBadgeColor(member.role_slug)}
                              variant="outlined"
                            />
                            {member.role_slug === "rh" && member.is_owner && (
                              <Chip
                                label="RH principal"
                                size="small"
                                color="primary"
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {member.department || member.position || "-"}
                        </TableCell>
                        <TableCell>
                          {(member.sections ?? []).length > 0
                            ? member.sections
                                .map((section) => section.name)
                                .join(", ")
                            : "Toutes"}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {getContractTypeLabel(member.contract_type) || "-"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getEmploymentStatusLabel(member.employment_status)}
                          </Typography>
                          {member.contract_type === 2 && (
                            <Typography variant="caption" display="block">
                              {formatDate(member.contract_start_date)} →{" "}
                              {formatDate(member.contract_end_date)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            aria-label={`Actions pour ${member.fullname}`}
                            onClick={(event) =>
                              openMemberActions(event, member)
                            }
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
          <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Responsables RH
            </Typography>
            {hrManagers.length === 0 ? (
              <Typography color="text.secondary">
                Aucun responsable RH n’est encore créé.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Sections autorisées</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hrManagers.map((manager) => (
                      <TableRow hover key={manager.id}>
                        <TableCell>
                          <Typography fontWeight={700}>
                            {manager.fullname}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {manager.email || manager.phone || "Aucun contact"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              manager.is_owner
                                ? "RH principal"
                                : "RH secondaire"
                            }
                            color={manager.is_owner ? "primary" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {(manager.sections ?? []).length > 0
                            ? manager.sections
                                .map((section) => section.name)
                                .join(", ")
                            : "Accès global"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {hrManagerLastPage > 1 && (
              <Stack alignItems="center" sx={{ mt: 3 }}>
                <Pagination
                  count={hrManagerLastPage}
                  page={hrManagerPage}
                  onChange={(_, value) => {
                    setHrManagerPage(value);
                    loadHrManagers(value).catch((err) =>
                      setError(
                        err.response?.data?.message ||
                          "Impossible de charger les responsables RH.",
                      ),
                    );
                  }}
                  color="primary"
                />
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Leaves */}
        <Grid
          item
          xs={12}
          md={isLeavesPage ? 12 : 5}
          sx={{ display: isLeavesPage ? "block" : "none" }}
        >
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

      <Menu
        anchorEl={actionAnchor}
        open={Boolean(actionAnchor)}
        onClose={closeMemberActions}
      >
        <MenuItem
          onClick={() => {
            const member = actionMember;
            closeMemberActions();
            handleEdit(member);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Modifier
        </MenuItem>
        <MenuItem onClick={() => openLeaveForMember(actionMember)}>
          Demande de congé
        </MenuItem>
        <MenuItem
          onClick={() => {
            const member = actionMember;
            closeMemberActions();
            handleDelete(member);
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Supprimer
        </MenuItem>
      </Menu>

      <Dialog open={rhModalOpen} onClose={closeRhModal} fullWidth maxWidth="sm">
        <DialogTitle>Créer un compte RH</DialogTitle>
        <Box component="form" onSubmit={handleCreateRh}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Nom complet"
              value={rhForm.fullname}
              onChange={(event) =>
                setRhForm((form) => ({ ...form, fullname: event.target.value }))
              }
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Email"
              type="email"
              value={rhForm.email}
              onChange={(event) =>
                setRhForm((form) => ({ ...form, email: event.target.value }))
              }
              required
              fullWidth
            />
            <InternationalPhoneField
              label="Téléphone"
              value={rhForm.phone}
              onChange={(phone) => {
                setRhPhoneError("");
                setRhForm((form) => ({ ...form, phone }));
              }}
              error={Boolean(rhPhoneError)}
              helperText={rhPhoneError}
            />
            <FormControl fullWidth required={isHrOwner}>
              <InputLabel id="rh-sections-label">
                Sections autorisées
              </InputLabel>
              <Select
                labelId="rh-sections-label"
                multiple
                value={rhForm.section_ids}
                label="Sections autorisées"
                renderValue={(selected) =>
                  schoolSections
                    .filter((section) => selected.includes(section.id))
                    .map((section) => section.name)
                    .join(", ")
                }
                onChange={(event) => {
                  const value = event.target.value;
                  setRhForm((form) => ({
                    ...form,
                    section_ids: Array.isArray(value)
                      ? value
                      : value.split(","),
                  }));
                }}
              >
                {schoolSections.map((section) => (
                  <MenuItem key={section.id} value={section.id}>
                    <Checkbox
                      checked={rhForm.section_ids.includes(section.id)}
                    />
                    {section.name}
                  </MenuItem>
                ))}
              </Select>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, ml: 1.5 }}
              >
                {isHrOwner
                  ? "Sélectionnez au moins une section. Un RH ne peut pas avoir un accès global."
                  : "Vide = accès à toutes les sections de l’école."}
              </Typography>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeRhModal}>Annuler</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !rhRoleId}
            >
              {submitting ? "Création..." : "Créer le compte RH"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ✅ Staff Modal */}
      <Dialog
        open={staffModalOpen}
        onClose={closeStaffModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingUserId ? "Modifier le profil RH" : "Ajouter un profil RH"}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              select
              label="Membre"
              value={form.user_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, user_id: e.target.value }))
              }
              fullWidth
              required
              disabled={!!editingUserId}
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
                setForm((prev) => ({ ...prev, monthly_salary: e.target.value }))
              }
              fullWidth
            />

            <TextField
              select
              label="Type de contrat"
              value={form.contract_type}
              onChange={(e) =>
                setForm((prev) => {
                  const contractType = Number(e.target.value);
                  return {
                    ...prev,
                    contract_type: contractType,
                    ...(contractType === 2
                      ? {}
                      : { contract_start_date: "", contract_end_date: "" }),
                  };
                })
              }
              fullWidth
            >
              {CONTRACT_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            {form.contract_type === 2 && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Début du CDD"
                  type="date"
                  value={form.contract_start_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      contract_start_date: e.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />
                <TextField
                  label="Fin du CDD"
                  type="date"
                  value={form.contract_end_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      contract_end_date: e.target.value,
                    }))
                  }
                  inputProps={{ min: form.contract_start_date || undefined }}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeStaffModal}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting
                ? "Enregistrement..."
                : editingUserId
                  ? "Mettre à jour"
                  : "Enregistrer"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ✅ Leave Modal */}
      <Dialog
        open={leaveModalOpen}
        onClose={closeLeaveModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nouvelle demande de congé</DialogTitle>
        <Box component="form" onSubmit={handleLeaveSubmit}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {error && <Alert severity="error">{error}</Alert>}

            {leaveForm.user_id ? (
              <TextField
                label="Employé"
                value={
                  members.find((member) => member.user_id === leaveForm.user_id)
                    ?.label ?? leaveForm.user_id
                }
                slotProps={{ input: { readOnly: true } }}
                fullWidth
              />
            ) : (
              <TextField
                select
                label="Personnel"
                value={leaveForm.user_id}
                onChange={(e) =>
                  setLeaveForm((prev) => ({
                    ...prev,
                    user_id: e.target.value,
                  }))
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
            )}

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
                  setLeaveForm((prev) => ({ ...prev, ends_on: e.target.value }))
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
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeLeaveModal}>Annuler</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={leaveSubmitting}
            >
              {leaveSubmitting ? "Enregistrement..." : "Enregistrer la demande"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
