import { useEffect, useMemo, useState } from "react";
import {
  Alert, Avatar, Box, Button, Card, CardContent, Checkbox, Chip, Grid,
  IconButton, InputAdornment, MenuItem, Pagination, Paper, Stack, TextField,
  Tooltip, Typography,
} from "@mui/material";
import { motion } from "motion/react";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { usePaginatedList } from "../hooks/usePaginatedList.js";

const RESTRICTED_ROLE_SLUGS = ["parent", "eleve", "professeur", "superadmin"];
const EMPTY_FORM = { fullname: "", email: "", phone: "", role_id: "", section_ids: [] };

export default function DashboardMembersPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const { data: members, page, setPage, lastPage, search, setSearch, loading, error: listError, reload } =
    usePaginatedList(schoolId ? `/schools/${schoolId}/members` : null);
  const { data: schoolData } = useApiGet(schoolId ? `/schools/${schoolId}/settings` : null, { enabled: Boolean(schoolId) });
  const { data: memberships } = useApiGet("/my-schools", { enabled: Boolean(user) });
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const activeSections = useMemo(
    () => (schoolData?.sections ?? []).filter((section) => section.pivot?.active),
    [schoolData],
  );
  const isFounder = useMemo(
    () => (memberships ?? []).find((membership) => membership.school_id === schoolId)?.role?.slug === "fondateur",
    [memberships, schoolId],
  );
 const availableRoles = useMemo(
  () =>
    roles.filter((role) => {
      // 1. Exclure les rôles restreints globaux
      if (RESTRICTED_ROLE_SLUGS.includes(role.slug)) return false;

      // 2. Personne ne peut attribuer le rôle "fondateur"
      if (role.slug === "fondateur") return false;

      // 3. Seul un fondateur peut attribuer le rôle "directeur"
      if (role.slug === "directeur") return isFounder;

      return true;
    }),
  [isFounder, roles],
);

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
      setError(messages ? Object.values(messages).flat().join(" ") : requestError.response?.data?.message || "Impossible d'enregistrer ce membre.");
    } finally {
      setSubmitting(false);
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
    if (!window.confirm(`Retirer ${member.user?.fullname || "ce membre"} de l'école ?`)) return;
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
      setError(requestError.response?.data?.message || "Impossible de retirer ce membre.");
    }
  }

  if (!schoolId) {
    return <Box sx={{ py: 8, textAlign: "center" }}><Typography color="text.secondary">Aucune école active.</Typography></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Membres de l'équipe</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Attribuez un rôle et les sections actives auxquelles chaque membre peut accéder.
      </Typography>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <TextField
            placeholder="Rechercher un membre..." value={search} onChange={(event) => setSearch(event.target.value)} fullWidth sx={{ mb: 2 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />
          {listError && <Alert severity="error" sx={{ mb: 2 }}>{listError}</Alert>}
          {loading ? <Typography color="text.secondary">Chargement...</Typography> : (
            <Stack spacing={2}>
              {members.map((member, index) => (
                <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.03 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                      <Avatar sx={{ bgcolor: "primary.main" }}>{member.user?.fullname?.charAt(0).toUpperCase()}</Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap>{member.user?.fullname}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>{member.user?.email} {member.user?.phone ? `· ${member.user.phone}` : ""}</Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                          <Chip label={member.role?.name || "Membre"} size="small" color="primary" variant="outlined" />
                          {member.sections?.length ? member.sections.map((section) => (
                            <Chip key={section.id} label={section.name} size="small" variant="outlined" />
                          )) : <Chip label="Toutes les sections" size="small" variant="outlined" />}
                        </Stack>
                      </Box>
                      {member.role?.slug !== "fondateur" && (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Modifier le membre"><IconButton aria-label="Modifier le membre" onClick={() => handleEdit(member)} size="small"><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Retirer le membre"><IconButton aria-label="Retirer le membre" onClick={() => handleDelete(member)} size="small" color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {members.length === 0 && <Typography color="text.secondary">Aucun membre trouvé.</Typography>}
            </Stack>
          )}
          {lastPage > 1 && <Stack alignItems="center" sx={{ mt: 3 }}><Pagination count={lastPage} page={page} onChange={(_, value) => setPage(value)} color="primary" /></Stack>}
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>{editingMember ? "Modifier un membre" : "Ajouter un membre"}</Typography>
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField label="Email" type="email" value={form.email} onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))} required={Boolean(editingMember)} fullWidth />
              <TextField label="Téléphone" value={form.phone} onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))} fullWidth />
              <TextField label="Nom complet" helperText="Requis si le membre n'a pas encore de compte" value={form.fullname} onChange={(event) => setForm((previous) => ({ ...previous, fullname: event.target.value }))} fullWidth />
              <TextField select label="Rôle" value={form.role_id} onChange={(event) => setForm((previous) => ({ ...previous, role_id: event.target.value }))} required fullWidth>
                {availableRoles.map((role) => <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>)}
              </TextField>
              <TextField
                select label="Sections attribuées" value={form.section_ids}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((previous) => ({ ...previous, section_ids: typeof value === "string" ? value.split(",") : value }));
                }}
                SelectProps={{
                  multiple: true,
                  renderValue: (selected) => <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((id) => <Chip key={id} label={activeSections.find((section) => section.id === id)?.name || id} size="small" variant="outlined" />)}
                  </Box>,
                }}
                helperText="Laissez vide pour attribuer un accès global à l'école." fullWidth
              >
                {activeSections.map((section) => <MenuItem key={section.id} value={section.id}><Checkbox checked={form.section_ids.includes(section.id)} />{section.name}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button type="submit" variant="contained" disabled={submitting}>{submitting ? "Enregistrement..." : editingMember ? "Enregistrer" : "Ajouter"}</Button>
                {editingMember && <Button type="button" onClick={() => { setEditingMember(null); setForm(EMPTY_FORM); setError(null); setSuccess(null); }}>Annuler</Button>}
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
