import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Select,
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
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ShareIcon from "@mui/icons-material/Share";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import InternationalPhoneField from "../components/InternationalPhoneField.jsx";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { usePaginatedList } from "../hooks/usePaginatedList.js";
import { getSchoolAdminAccess } from "../utils/schoolAdminAccess.js";
import { asArray } from "../utils/apiData.js";

const RESTRICTED_ROLE_SLUGS = ["parent", "eleve", "professeur", "superadmin"];
const EMPTY_FORM = {
  fullname: "",
  email: "",
  phone: "",
  role_id: "",
  section_ids: [],
};

export default function DashboardMembersPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const {
    data: members,
    page,
    setPage,
    lastPage,
    search,
    setSearch,
    loading,
    error: listError,
    reload,
  } = usePaginatedList(schoolId ? `/schools/${schoolId}/members` : null);
  const { data: schoolData } = useApiGet(
    schoolId ? `/schools/${schoolId}/settings` : null,
    { enabled: Boolean(schoolId) },
  );
  const { data: memberships } = useApiGet("/my-schools", {
    enabled: Boolean(user),
  });
  const { data: invitationsData, reload: reloadInvitations } = useApiGet(
    schoolId ? `/schools/${schoolId}/member-invitations` : null,
    { enabled: Boolean(schoolId) },
  );
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [actionAnchor, setActionAnchor] = useState(null);
  const [actionMember, setActionMember] = useState(null);

  const activeSections = useMemo(
    () =>
      (schoolData?.sections ?? []).filter((section) => section.pivot?.active),
    [schoolData],
  );
  const currentMembership = useMemo(
    () =>
      (memberships ?? []).find(
        (membership) => membership.school_id === schoolId,
      ),
    [memberships, schoolId],
  );
  const { isPrincipalAdmin, isGeneralAdmin } =
    getSchoolAdminAccess(currentMembership);
  const availableRoles = useMemo(
    () =>
      roles.filter((role) => {
        if (RESTRICTED_ROLE_SLUGS.includes(role.slug)) return false;

        if (role.slug === "admin") {
          return isPrincipalAdmin || isGeneralAdmin;
        }

        return true;
      }),
    [isGeneralAdmin, isPrincipalAdmin, roles],
  );
  const invitations = asArray(invitationsData);

  useEffect(() => {
    api.get("/roles").then((response) => setRoles(response.data));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      if (editingMember) {
        await api.put(`/schools/${schoolId}/members/${editingMember.id}`, form);
        setSuccess("Membre modifié avec succès.");
      } else {
        await api.post(`/schools/${schoolId}/members`, form);
        setSuccess("Membre ajouté avec succès.");
      }
      reload();
      setForm(EMPTY_FORM);
      setEditingMember(null);
    } catch (requestError) {
      const messages = requestError.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : requestError.response?.data?.message ||
              "Impossible d'enregistrer ce membre.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInvitation() {
    setError(null);
    setSuccess(null);
    setInviting(true);
    try {
      const response = await api.post(
        `/schools/${schoolId}/members/invitation`,
        form,
      );
      const invitationUrl = response.data?.invitation_url;
      const message = `Bonjour, voici votre lien pour rejoindre l'école. Saisissez vos informations puis attendez la validation de l'administration. Le lien est valable 24 heures : ${invitationUrl}`;
      const whatsappNumber = form.phone?.replace(/\D/g, "");
      const whatsappUrl = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      setSuccess("Le lien d'invitation est prêt dans WhatsApp.");
      reloadInvitations();
    } catch (requestError) {
      const messages = requestError.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : requestError.response?.data?.message ||
              "Impossible de créer le lien d'invitation.",
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleReviewInvitation(invitation, decision) {
    setError(null);
    setSuccess(null);
    try {
      await api.post(
        `/schools/${schoolId}/member-invitations/${invitation.id}/review`,
        { decision },
      );
      await Promise.all([reload(), reloadInvitations()]);
      setSuccess(
        decision === "accept" ? "Invitation validée." : "Invitation rejetée.",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Impossible de traiter cette invitation.",
      );
    }
  }

  function handleEdit(member) {
    setError(null);
    setSuccess(null);
    setEditingMember(member);
    setForm({
      fullname: member.user?.fullname || "",
      email: member.user?.email || "",
      phone: member.user?.phone || "",
      role_id: member.role_id || member.role?.id || "",
      section_ids: member.sections?.map((section) => section.id) || [],
    });
  }

  async function handleDelete(member) {
    if (
      !window.confirm(
        `Retirer ${member.user?.fullname || "ce membre"} de l'école ?`,
      )
    )
      return;
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/schools/${schoolId}/members/${member.id}`);
      if (editingMember?.id === member.id) {
        setEditingMember(null);
        setForm(EMPTY_FORM);
      }
      reload();
      setSuccess("Membre retiré de l'école.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Impossible de retirer ce membre.",
      );
    }
  }

  function closeActions() {
    setActionAnchor(null);
    setActionMember(null);
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
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Membres de l'équipe
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Attribuez un rôle et les sections actives auxquelles chaque membre peut
        accéder.
      </Typography>

      {invitations.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Invitations à traiter
          </Typography>
          <Stack spacing={1}>
            {invitations.map((invitation) => (
              <Stack
                key={invitation.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  pb: 1,
                }}
              >
                <Box>
                  <Typography fontWeight={700}>
                    {invitation.fullname || "Informations en attente"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {invitation.email || invitation.phone || "Lien envoyé"} ·{" "}
                    {invitation.role?.name || "Rôle"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {invitation.status === "submitted"
                      ? "Demande reçue"
                      : "Lien en attente de réponse"}
                    {invitation.section_ids?.length
                      ? ` · Sections : ${invitation.section_ids
                          .map(
                            (id) =>
                              activeSections.find(
                                (section) => section.id === id,
                              )?.name || id,
                          )
                          .join(", ")}`
                      : " · Toutes les sections"}
                  </Typography>
                </Box>
                {invitation.status === "submitted" && (
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckIcon />}
                      onClick={() =>
                        handleReviewInvitation(invitation, "accept")
                      }
                    >
                      Valider
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<CloseIcon />}
                      onClick={() =>
                        handleReviewInvitation(invitation, "reject")
                      }
                    >
                      Rejeter
                    </Button>
                  </Stack>
                )}
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <TextField
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
            sx={{ mb: 2 }}
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
          {listError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {listError}
            </Alert>
          )}
          {loading ? (
            <Typography color="text.secondary">Chargement...</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Membre</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Téléphone</TableCell>
                    <TableCell>Rôle</TableCell>
                    <TableCell>Sections</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => (
                    <TableRow hover key={member.id}>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {member.user?.fullname}
                        </Typography>
                      </TableCell>
                      <TableCell>{member.user?.email || "-"}</TableCell>
                      <TableCell>{member.user?.phone || "-"}</TableCell>
                      <TableCell>
                        <Chip
                          label={member.role?.name || "Membre"}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {member.sections?.length
                          ? member.sections
                              .map((section) => section.name)
                              .join(", ")
                          : "Toutes les sections"}
                      </TableCell>
                      <TableCell align="right">
                        {!(
                          member.role?.slug === "admin" && member.is_owner
                        ) && (
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              setActionAnchor(event.currentTarget);
                              setActionMember(member);
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography color="text.secondary">
                          Aucun membre trouvé.
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
                const member = actionMember;
                closeActions();
                handleEdit(member);
              }}
            >
              <EditIcon fontSize="small" sx={{ mr: 1 }} /> Modifier
            </MenuItem>
            <MenuItem
              onClick={() => {
                const member = actionMember;
                closeActions();
                handleDelete(member);
              }}
              sx={{ color: "error.main" }}
            >
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Retirer
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
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {editingMember ? "Modifier un membre" : "Ajouter un membre"}
            </Typography>
            {!editingMember && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Pour inviter quelqu’un sans saisir ses coordonnées, choisissez
                seulement son rôle et ses sections puis utilisez le bouton
                WhatsApp.
              </Typography>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                required={Boolean(editingMember)}
                fullWidth
              />
              <InternationalPhoneField
                value={form.phone}
                onChange={(phone) =>
                  setForm((previous) => ({ ...previous, phone }))
                }
              />
              <TextField
                label="Nom complet"
                helperText="Requis si le membre n'a pas encore de compte"
                value={form.fullname}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    fullname: event.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                select
                label="Rôle"
                value={form.role_id}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    role_id: event.target.value,
                  }))
                }
                required
                fullWidth
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </TextField>
              <FormControl fullWidth>
                <InputLabel id="member-sections-label">
                  Sections attribuées
                </InputLabel>
                <Select
                  labelId="member-sections-label"
                  multiple
                  value={form.section_ids}
                  label="Sections attribuées"
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      section_ids: event.target.value,
                    }))
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((id) => (
                        <Chip
                          key={id}
                          label={
                            activeSections.find((section) => section.id === id)
                              ?.name || id
                          }
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
                >
                  {activeSections.map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      <Checkbox
                        checked={form.section_ids.includes(section.id)}
                      />
                      {section.name}
                    </MenuItem>
                  ))}
                </Select>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Laissez vide pour attribuer un accès global à l'école.
                </Typography>
              </FormControl>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ mt: 1 }}
              >
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting
                    ? "Enregistrement..."
                    : editingMember
                      ? "Enregistrer"
                      : "Ajouter"}
                </Button>
                {!editingMember && (
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    onClick={handleInvitation}
                    disabled={inviting || submitting || !form.role_id}
                  >
                    {inviting ? "Création..." : "Inviter par WhatsApp"}
                  </Button>
                )}
                {editingMember && (
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingMember(null);
                      setForm(EMPTY_FORM);
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    Annuler
                  </Button>
                )}
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
