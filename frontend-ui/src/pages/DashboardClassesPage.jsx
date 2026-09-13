import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Menu,
} from "@mui/material";
import { motion } from "motion/react";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import api from "../api/axios.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { usePaginatedList } from "../hooks/usePaginatedList.js";
import { useAuth } from "../context/AuthContext";

export default function DashboardClassesPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const { data: memberships } = useApiGet("/my-schools", {
    enabled: Boolean(user),
  });
  const membership = useMemo(
    () => (memberships ?? []).find((item) => item.school_id === schoolId),
    [memberships, schoolId],
  );
  const roleSlug = membership?.role?.slug;
  const canManageClasses = ["fondateur", "directeur"].includes(roleSlug);

  const activeSections = useMemo(
    () =>
      (membership?.school?.sections ?? []).filter(
        (section) => section.pivot?.active,
      ),
    [membership],
  );

  // ✅ État pour filtre section
  const [sectionFilter, setSectionFilter] = useState("");

  const {
    data: classes,
    page,
    setPage,
    lastPage,
    search,
    setSearch,
    loading,
    error: listError,
    reload,
  } = usePaginatedList(
    schoolId
      ? `/schools/${schoolId}/classes${sectionFilter ? `?section_id=${sectionFilter}` : ""}`
      : null,
  );

  const { data: levels, error: levelsError } = useApiGet(
    canManageClasses && schoolId ? `/schools/${schoolId}/levels` : null,
  );
  const availableLevels = useMemo(() => {
    const activeSectionIds = activeSections.map((section) => section.id);
    const assignedSectionIds =
      membership?.sections?.map((section) => section.id) ?? [];
    const allowedSectionIds =
      roleSlug !== "fondateur" && assignedSectionIds.length > 0
        ? assignedSectionIds
        : activeSectionIds;

    return (levels ?? []).filter(
      (level) =>
        activeSectionIds.includes(level.section_id) &&
        allowedSectionIds.includes(level.section_id),
    );
  }, [activeSections, levels, membership, roleSlug]);

  const { data: teachersData, error: teachersError } = useApiGet(
    canManageClasses && schoolId ? `/schools/${schoolId}/teachers` : null,
    { params: { per_page: 100 } },
  );
  const teachers = teachersData?.data ?? [];
  const { data: subjects, error: subjectsError } = useApiGet(
    canManageClasses ? "/subjects" : null,
  );

  const auxError = levelsError || teachersError || subjectsError;

  // ✅ États pour Create/Edit
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({ name: "", level_id: "" });
  const [editingClass, setEditingClass] = useState(null);
  const [classError, setClassError] = useState(null);
  const [classSubmitting, setClassSubmitting] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuClassId, setMenuClassId] = useState(null);
  // ✅ État pour Delete
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewTeachersClass, setViewTeachersClass] = useState(null);
  const [assignClass, setAssignClass] = useState(null);
  const [assignForm, setAssignForm] = useState({
    subject_id: "",
    user_id: "",
    coefficient: "1",
  });
  const [assignError, setAssignError] = useState(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function closeClassModal() {
    setClassModalOpen(false);
    setClassForm({ name: "", level_id: "" });
    setEditingClass(null);
    setClassError(null);
  }

  // ✅ Open Edit Modal
  function openEditModal(classItem) {
    setEditingClass(classItem);
    setClassForm({ name: classItem.name, level_id: classItem.level_id });
    setClassError(null);
    setClassModalOpen(true);
  }

  async function handleCreateClass(e) {
    e.preventDefault();
    setClassError(null);
    setClassSubmitting(true);
    try {
      if (editingClass) {
        // ✅ UPDATE
        await api.put(
          `/schools/${schoolId}/classes/${editingClass.id}`,
          classForm,
        );
      } else {
        // ✅ CREATE
        await api.post(`/schools/${schoolId}/classes`, classForm);
      }
      reload();
      closeClassModal();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setClassError(
        messages
          ? Object.values(messages).flat().join(" ")
          : err.response?.data?.message ||
              "Impossible de sauvegarder la classe.",
      );
    } finally {
      setClassSubmitting(false);
    }
  }

  // ✅ DELETE
  async function handleDelete(classItem) {
    setClassSubmitting(true);
    try {
      await api.delete(`/schools/${schoolId}/classes/${classItem.id}`);
      setDeleteConfirm(null);
      reload();
    } catch (err) {
      setClassError(
        err.response?.data?.message || "Impossible de supprimer la classe.",
      );
    } finally {
      setClassSubmitting(false);
    }
  }

  function closeAssignModal() {
    setAssignClass(null);
    setAssignForm({ subject_id: "", user_id: "", coefficient: "1" });
    setAssignError(null);
  }

  async function handleAssign(e) {
    e.preventDefault();
    setAssignError(null);
    setAssignSubmitting(true);
    try {
      await api.post(
        `/schools/${schoolId}/classes/${assignClass.id}/teachers`,
        assignForm,
      );
      reload();
      closeAssignModal();
    } catch (err) {
      const messages = err.response?.data?.errors;
      setAssignError(
        messages
          ? Object.values(messages).flat().join(" ")
          : err.response?.data?.message ||
              "Impossible d'assigner ce professeur.",
      );
    } finally {
      setAssignSubmitting(false);
    }
  }

  async function handleDeleteTeacher(assignmentId) {
    if (!window.confirm("Supprimer ce professeur?")) return;

    try {
      await api.delete(`/schools/${schoolId}/teachers/${assignmentId}`);
      reload();
    } catch (err) {
      listError(
        err.response?.data?.message || "Impossible de supprimer ce professeur.",
      );
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
            Classes
          </Typography>
          <Typography color="text.secondary">
            Un professeur peut enseigner plusieurs matières dans une même
            classe.
          </Typography>
        </Box>
        {canManageClasses && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setClassModalOpen(true)}
          >
            Ajouter une classe
          </Button>
        )}
      </Stack>
      {(listError || auxError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {listError || auxError}
        </Alert>
      )}
      {/* ✅ Filtre Section */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <TextField
          select
          label="Filtrer par section"
          value={sectionFilter}
          onChange={(e) => {
            setSectionFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Toutes les sections</MenuItem>
          {activeSections.map((section) => (
            <MenuItem key={section.id} value={section.id}>
              {section.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          placeholder="Rechercher une classe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
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
      </Stack>
      {loading ? (
        <Box
          sx={{
            py: 8,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography color="text.secondary">Chargement...</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {classes?.map((c, i) => {
            const teachers = c?.class_subject_teachers ?? [];
            const sectionName =
              c?.level?.section?.name ??
              activeSections.find(
                (section) => section?.id === c?.level?.section_id,
              )?.name;

            const levelName = c?.level?.name;

            return (
              <motion.div
                key={c?.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: 3,
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    {/* =====================================================
                  HEADER
              ===================================================== */}
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="flex-start"
                      justifyContent="space-between"
                    >
                      {/* Informations classe */}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          sx={{
                            lineHeight: 1.3,
                            wordBreak: "break-word",
                          }}
                        >
                          {c?.name}
                        </Typography>

                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          sx={{ mt: 0.75 }}
                        >
                          {sectionName && (
                            <Chip
                              label={sectionName}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 26,
                                fontSize: "0.75rem",
                              }}
                            />
                          )}

                          {levelName && (
                            <Chip
                              label={levelName}
                              size="small"
                              color="primary"
                              sx={{
                                height: 26,
                                fontSize: "0.75rem",
                              }}
                            />
                          )}
                        </Stack>
                      </Box>

                      {/* Menu mobile */}
                      <Box
                        sx={{
                          display: { xs: "block", sm: "none" },
                          flexShrink: 0,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setMenuClassId(c?.id);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>

                        <Menu
                          anchorEl={
                            anchorEl && menuClassId === c?.id ? anchorEl : null
                          }
                          open={Boolean(anchorEl && menuClassId === c?.id)}
                          onClose={() => setAnchorEl(null)}
                          anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                          }}
                          transformOrigin={{
                            vertical: "top",
                            horizontal: "right",
                          }}
                        >
                          <MenuItem
                            onClick={() => {
                              setViewTeachersClass(c);
                              setAnchorEl(null);
                            }}
                          >
                            Voir les professeurs
                          </MenuItem>

                          <MenuItem
                            component={RouterLink}
                            to={`/dashboard/classes/${c?.id}/timetable`}
                            onClick={() => setAnchorEl(null)}
                          >
                            Emploi du temps
                          </MenuItem>

                          {canManageClasses && (
                            <>
                              <MenuItem
                                onClick={() => {
                                  setAssignClass(c);
                                  setAnchorEl(null);
                                }}
                              >
                                Ajouter un professeur
                              </MenuItem>

                              <MenuItem
                                onClick={() => {
                                  openEditModal(c);
                                  setAnchorEl(null);
                                }}
                              >
                                Modifier
                              </MenuItem>

                              <MenuItem
                                onClick={() => {
                                  setDeleteConfirm(c);
                                  setAnchorEl(null);
                                }}
                                sx={{ color: "error.main" }}
                              >
                                Supprimer
                              </MenuItem>
                            </>
                          )}
                        </Menu>
                      </Box>
                    </Stack>

                    {/* =====================================================
                  ACTIONS DESKTOP
              ===================================================== */}
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{
                        mt: 2.5,
                        display: { xs: "none", sm: "flex" },
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<SearchIcon />}
                        onClick={() => setViewTeachersClass(c)}
                      >
                        Professeurs ({teachers.length})
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        component={RouterLink}
                        to={`/dashboard/classes/${c?.id}/timetable`}
                      >
                        Emploi du temps
                      </Button>

                      {canManageClasses && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => setAssignClass(c)}
                        >
                          Ajouter un professeur
                        </Button>
                      )}
                    </Stack>

                    {/* =====================================================
                  SEPARATEUR
              ===================================================== */}
                    <Box
                      sx={{
                        height: 1,
                        bgcolor: "divider",
                        my: 2.5,
                      }}
                    />

                    {/* =====================================================
                  PROFESSEURS
              ===================================================== */}
                    <Stack spacing={1.25}>
                      {teachers.length > 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {teachers.length}
                          {teachers.length > 1
                            ? "professeurs sont assignés à cette classe."
                            : "professeur est assigné à cette classe."}
                        </Typography>
                      ) : (
                        <Box
                          sx={{
                            py: 2.5,
                            px: 2,
                            textAlign: "center",
                            borderRadius: 2,
                            bgcolor: "action.hover",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Aucun professeur assigné à cette classe.
                          </Typography>

                          {canManageClasses && (
                            <Button
                              size="small"
                              color="primary"
                              sx={{ mt: 1 }}
                              onClick={() => setAssignClass(c)}
                            >
                              Assigner un professeur
                            </Button>
                          )}
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* =====================================================
        AUCUNE CLASSE
    ===================================================== */}
          {(!classes || classes.length === 0) && (
            <Box
              sx={{
                py: 8,
                px: 2,
                textAlign: "center",
                border: 1,
                borderColor: "divider",
                borderRadius: 3,
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Aucune classe trouvée
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Aucune classe ne correspond aux critères sélectionnés.
              </Typography>

              {canManageClasses && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  sx={{ mt: 2 }}
                  onClick={() => setClassModalOpen(true)}
                >
                  Ajouter une classe
                </Button>
              )}
            </Box>
          )}
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
      {/* ✅ Create/Edit Modal */}
      <Dialog
        open={classModalOpen}
        onClose={closeClassModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {editingClass ? "Modifier la classe" : "Ajouter une classe"}
        </DialogTitle>
        <Box component="form" onSubmit={handleCreateClass}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {classError && <Alert severity="error">{classError}</Alert>}
            <TextField
              label="Nom de la classe"
              value={classForm.name}
              onChange={(e) =>
                setClassForm((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Niveau"
              value={classForm.level_id}
              onChange={(e) =>
                setClassForm((prev) => ({ ...prev, level_id: e.target.value }))
              }
              required
              fullWidth
            >
              {availableLevels?.map((level) => (
                <MenuItem key={level?.id} value={level?.id}>
                  {
                    activeSections.find(
                      (section) => section?.id === level?.section_id,
                    )?.name
                  }{" "}
                  · {level?.name}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeClassModal}>Annuler</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={classSubmitting}
            >
              {classSubmitting
                ? editingClass
                  ? "Modification..."
                  : "Création..."
                : editingClass
                  ? "Modifier"
                  : "Créer"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      {/* ✅ Delete Confirmation Modal */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        maxWidth="xs"
      >
        <DialogTitle>Supprimer la classe?</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer{" "}
            <strong>{deleteConfirm?.name}</strong>?
          </Typography>
          {classError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {classError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteConfirm(null)}
            disabled={classSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={() => handleDelete(deleteConfirm)}
            variant="contained"
            color="error"
            disabled={classSubmitting}
          >
            {classSubmitting ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Assign Modal - Unchanged */}
      <Dialog
        open={Boolean(assignClass)}
        onClose={closeAssignModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Assigner un professeur — {assignClass?.name}</DialogTitle>
        <Box component="form" onSubmit={handleAssign}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {assignError && <Alert severity="error">{assignError}</Alert>}
            <TextField
              select
              label="Matière"
              value={assignForm.subject_id}
              onChange={(e) =>
                setAssignForm((prev) => ({
                  ...prev,
                  subject_id: e.target.value,
                }))
              }
              required
              fullWidth
            >
              {(subjects ?? []).map((subject) => (
                <MenuItem key={subject?.id} value={subject?.id}>
                  {subject?.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Professeur"
              value={assignForm.user_id}
              onChange={(e) =>
                setAssignForm((prev) => ({ ...prev, user_id: e.target.value }))
              }
              required
              fullWidth
              helperText={
                teachers.length === 0
                  ? "Ajoutez d'abord un professeur depuis la page Professeurs."
                  : ""
              }
            >
              {teachers.map((t) => (
                <MenuItem key={t?.id} value={t?.user_id}>
                  {t?.user?.fullname}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Coefficient de la matière"
              type="number"
              value={assignForm.coefficient}
              onChange={(e) =>
                setAssignForm((prev) => ({
                  ...prev,
                  coefficient: e.target.value,
                }))
              }
              helperText="Poids de cette matière dans la moyenne générale de la classe (ex: 4 pour Maths, 1 pour Musique)."
              slotProps={{ htmlInput: { min: 1, max: 20, step: 0.5 } }}
              required
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeAssignModal}>Annuler</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={assignSubmitting || teachers.length === 0}
            >
              {assignSubmitting ? "Ajout..." : "Assigner"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      {/* View Teachers Modal */}
      <Dialog
        open={!!viewTeachersClass}
        onClose={() => setViewTeachersClass(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Professeurs de {viewTeachersClass?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {viewTeachersClass?.class_subject_teachers &&
            viewTeachersClass?.class_subject_teachers.length > 0 ? (
              viewTeachersClass?.class_subject_teachers.map((assignment) => (
                <Card key={assignment?.id} variant="outlined">
                  <CardContent>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2">
                          {assignment?.teacher?.fullname}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {assignment?.subject?.name} • Coef.{" "}
                          {assignment?.coefficient}
                        </Typography>
                      </Box>
                      {/* {canManageClasses && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteTeacher(assignment?.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )} */}
                    </Stack>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography color="text.secondary">
                Aucun professeur assigné.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          {canManageClasses && (
            <Button
              onClick={() => {
                setAssignClass(viewTeachersClass);
                setViewTeachersClass(null);
              }}
              variant="contained"
              size="small"
            >
              Ajouter un prof
            </Button>
          )}
          <Button onClick={() => setViewTeachersClass(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
