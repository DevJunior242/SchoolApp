import { useState } from "react";
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
  Menu,
  Checkbox,
  FormControl,
  InputLabel,
  InputAdornment,
  MenuItem,
  Pagination,
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
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InternationalPhoneField from "../components/InternationalPhoneField.jsx";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePaginatedList } from "../hooks/usePaginatedList.js";
import { useApiGet } from "../hooks/useApiGet.js";

const emptyForm = { fullname: "", email: "", phone: "", section_ids: [] };

export default function DashboardTeachersPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const {
    data: teachers,
    page,
    setPage,
    lastPage,
    search,
    setSearch,
    loading,
    error: listError,
    reload,
  } = usePaginatedList(schoolId ? `/schools/${schoolId}/teachers` : null);
  const { data: schoolData } = useApiGet(
    schoolId ? `/schools/${schoolId}/settings` : null,
    { enabled: Boolean(schoolId) },
  );
  const activeSections = (schoolData?.sections ?? []).filter(
    (section) => section.pivot?.active,
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionAnchor, setActionAnchor] = useState(null);
  const [actionTeacher, setActionTeacher] = useState(null);

  function closeModal() {
    setOpen(false);
    setForm(emptyForm);
    setError(null);
    setFieldErrors({});
    setEditingTeacher(null);
  }

  function openAddModal() {
    setEditingTeacher(null);
    setForm(emptyForm);
    setError(null);
    setFieldErrors({});
    setOpen(true);
  }

  function openEditModal(teacher) {
    setEditingTeacher(teacher);
    setForm({
      fullname: teacher.user?.fullname || "",
      email: teacher.user?.email || "",
      phone: teacher.user?.phone || "",
      section_ids: (teacher.sections ?? []).map((section) => section.id),
    });
    setError(null);
    setFieldErrors({});
    setOpen(true);
  }

  function closeActions() {
    setActionAnchor(null);
    setActionTeacher(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (editingTeacher) {
        // Update
        await api.put(
          `/schools/${schoolId}/teachers/${editingTeacher.id}`,
          form,
        );
      } else {
        // Create
        await api.post(`/schools/${schoolId}/teachers`, form);
      }
      reload();
      closeModal();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setFieldErrors(messages ?? {});
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : err.response?.data?.message ||
              "Impossible de sauvegarder ce professeur.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(teacher) {
    setSubmitting(true);
    try {
      await api.delete(`/schools/${schoolId}/teachers/${teacher.id}`);
      setDeleteConfirm(null);
      reload();
    } catch (err) {
      setError(
        err.response?.data?.message || "Impossible de supprimer ce professeur.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Professeurs
          </Typography>
          <Typography color="text.secondary">
            Enseignants rattachés à cette école.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAddModal}
        >
          Ajouter un professeur
        </Button>
      </Stack>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {listError}
        </Alert>
      )}

      <TextField
        placeholder="Rechercher un professeur..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
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

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <TableContainer component={Card} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Sections</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow hover key={teacher.id}>
                  <TableCell>
                    <Typography fontWeight={700}>
                      {teacher.user?.fullname}
                    </Typography>
                  </TableCell>
                  <TableCell>{teacher.user?.email || "-"}</TableCell>
                  <TableCell>{teacher.user?.phone || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={teacher.role?.name || "Professeur"}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {(teacher.sections ?? [])
                      .map((section) => section.name)
                      .join(", ") || "-"}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        setActionAnchor(event.currentTarget);
                        setActionTeacher(teacher);
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {teachers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">
                      Aucun professeur trouvé.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu
        anchorEl={actionAnchor}
        open={Boolean(actionAnchor)}
        onClose={closeActions}
      >
        <MenuItem
          onClick={() => {
            const teacher = actionTeacher;
            closeActions();
            openEditModal(teacher);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Modifier
        </MenuItem>
        <MenuItem
          onClick={() => {
            const teacher = actionTeacher;
            closeActions();
            setDeleteConfirm(teacher);
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Supprimer
        </MenuItem>
      </Menu>

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

      {/* Add/Edit Modal */}
      <Dialog open={open} onClose={closeModal} fullWidth maxWidth="xs">
        <DialogTitle>
          {editingTeacher ? "Modifier le professeur" : "Ajouter un professeur"}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              fullWidth
              autoFocus
            />
            <InternationalPhoneField
              value={form.phone}
              onChange={(phone) => setForm((prev) => ({ ...prev, phone }))}
              error={Boolean(fieldErrors.phone)}
              helperText={fieldErrors.phone?.[0] ?? ""}
            />
            <TextField
              label="Nom complet"
              helperText={
                editingTeacher
                  ? ""
                  : "Requis uniquement si le professeur n'a pas encore de compte"
              }
              value={form.fullname}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, fullname: e.target.value }))
              }
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel id="teacher-sections-label">Sections</InputLabel>
              <Select
                labelId="teacher-sections-label"
                multiple
                value={form.section_ids}
                label="Sections"
                renderValue={(selected) =>
                  activeSections
                    .filter((section) => selected.includes(section.id))
                    .map((section) => section.name)
                    .join(", ")
                }
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((current) => ({
                    ...current,
                    section_ids: Array.isArray(value)
                      ? value
                      : value.split(","),
                  }));
                }}
              >
                {activeSections.map((section) => (
                  <MenuItem key={section.id} value={section.id}>
                    <Checkbox checked={form.section_ids.includes(section.id)} />
                    {section.name}
                  </MenuItem>
                ))}
              </Select>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Primaire = Enseignant · Secondaire = Professeur. Ne mélangez pas
                les deux.
              </Typography>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeModal}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting
                ? editingTeacher
                  ? "Modification..."
                  : "Ajout..."
                : editingTeacher
                  ? "Modifier"
                  : "Ajouter"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        maxWidth="xs"
      >
        <DialogTitle>Supprimer le professeur?</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer{" "}
            <strong>{deleteConfirm?.user?.fullname}</strong>?
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={() => handleDelete(deleteConfirm)}
            variant="contained"
            color="error"
            disabled={submitting}
          >
            {submitting ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
