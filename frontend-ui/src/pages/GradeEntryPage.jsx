import { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "motion/react";
import { Link as RouterLink, useParams } from "react-router-dom";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { db } from "../offline/db.js";

const EVALUATION_TYPES = [
  { value: "interrogation", label: "Interrogation" },
  { value: "devoir", label: "Devoir" },
  { value: "composition", label: "Composition" },
  { value: "examen", label: "Examen" },
];

function emptyForm(seasonId = "") {
  return {
    student_id: "",
    season_id: seasonId,
    evaluation_type: "",
    title: "",
    score: "",
    max_score: "20",
    graded_at: new Date().toISOString().slice(0, 10),
  };
}

/** La saison dont la période de dates englobe aujourd'hui, sinon la première. */
function currentSeason(seasons) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    seasons.find(
      (s) =>
        s.start_date &&
        s.end_date &&
        s.start_date.slice(0, 10) <= today &&
        today <= s.end_date.slice(0, 10),
    ) ?? seasons[0]
  );
}

export default function GradeEntryPage() {
  const { assignmentId } = useParams();
  const { user } = useAuth();
  const schoolId = user.current_school_id;

  const { data: seasonsData } = useApiGet(
    schoolId ? `/schools/${schoolId}/seasons` : null,
  );
  // Comme pour la liste d'élèves : hors-ligne (ou juste après une panne), on
  // retombe sur la dernière liste de saisons connue pour cette école plutôt
  // que de bloquer le formulaire (le champ saison est obligatoire).
  const [cachedSeasons, setCachedSeasons] = useState([]);
  const seasons = seasonsData ?? cachedSeasons;

  const [assignment, setAssignment] = useState(null);
  const [studentsData, setStudentsData] = useState(null);
  const [studentsError, setStudentsError] = useState(null);
  const [cachedStudents, setCachedStudents] = useState([]);
  const students = studentsData ?? cachedStudents;

  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [seasonInitialized, setSeasonInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  // Pré-sélectionne la saison en cours dès qu'elle est connue, une seule
  // fois (sinon un refetch écraserait un choix déjà fait par l'utilisateur).
  if (seasons.length > 0 && !seasonInitialized) {
    setForm((prev) => ({
      ...prev,
      season_id: currentSeason(seasons)?.id ?? "",
    }));
    setSeasonInitialized(true);
  }

  // Recompte les notes en attente d'envoi dans Dexie. syncQueue est une table
  // générique partagée avec la saisie des présences (voir AttendanceEntryPage) ;
  // on filtre sur type ET status pour ne traiter que nos propres entrées ici.
  async function refreshQueuedCount() {
    const count = await db.syncQueue
      .where({ type: "grade", status: "pending" })
      .count();
    setQueuedCount(count);
  }

  useEffect(() => {
    async function loadLocalRoster() {
      // Même table `rosters` que la page de présences, indexée par
      // assignmentId : si l'enseignant a déjà ouvert la page de présences
      // pour ce cours, la liste d'élèves est déjà en cache ici aussi.
      const roster = await db.rosters
        .where("assignmentId")
        .equals(assignmentId)
        .first();

      if (roster) {
        setCachedStudents(roster.students);
      }
    }

    loadLocalRoster();
  }, [assignmentId]);

  useEffect(() => {
    async function cacheStudents() {
      if (!studentsData) return;

      await db.rosters.put({
        id: assignmentId,
        assignmentId,
        students: studentsData,
        updatedAt: new Date(),
      });

      setCachedStudents(studentsData);
    }

    cacheStudents();
  }, [assignmentId, studentsData]);

  useEffect(() => {
    async function loadLocalSeasons() {
      if (!schoolId) return;

      const rows = await db.seasons.where("school_id").equals(schoolId).toArray();

      if (rows.length > 0) {
        setCachedSeasons(rows);
      }
    }

    loadLocalSeasons();
  }, [schoolId]);

  useEffect(() => {
    async function cacheSeasons() {
      if (!seasonsData) return;

      await db.seasons.bulkPut(
        seasonsData.map((s) => ({ ...s, school_id: schoolId })),
      );

      setCachedSeasons(seasonsData);
    }

    cacheSeasons();
  }, [schoolId, seasonsData]);

  async function loadGrades() {
    // 1. Cache local d'abord, pour un affichage immédiat même hors-ligne.
    const cachedRows = await db.grades
      .where("assignmentId")
      .equals(assignmentId)
      .toArray();

    if (cachedRows.length > 0) {
      setGrades(cachedRows);
    }

    if (!navigator.onLine) return;

    try {
      const response = await api.get(`/assignments/${assignmentId}/grades`);
      const serverGrades = response.data.map((g) => ({
        ...g,
        assignmentId,
        pending: false,
      }));

      // On ne supprime que les notes déjà synchronisées (pending: false) :
      // une note saisie hors-ligne et pas encore envoyée doit rester visible
      // tant que flushGradeQueue ne l'a pas confirmée auprès du serveur.
      await db.grades.where({ assignmentId, pending: false }).delete();
      await db.grades.bulkPut(serverGrades);

      const stillPending = await db.grades
        .where({ assignmentId, pending: true })
        .toArray();

      setGrades([...serverGrades, ...stillPending]);
    } catch (err) {
      if (cachedRows.length === 0) {
        setLoadError(
          err.response?.data?.message || "Impossible de charger les notes.",
        );
      }
    }
  }

  // Envoie au serveur chaque note encore en attente dans syncQueue, appelé au
  // montage et à chaque retour de connexion. Comme pour les présences, on ne
  // filtre pas par assignmentId : ça permet de rattraper des notes mises en
  // attente sur un autre cours visité pendant la même coupure réseau.
  async function flushGradeQueue() {
    const pending = await db.syncQueue
      .where({ type: "grade", status: "pending" })
      .toArray();

    let anySynced = false;

    for (const item of pending) {
      try {
        await api.post(
          `/assignments/${item.payload.assignmentId}/grades`,
          item.payload.form,
        );

        await db.syncQueue.delete(item.id);
        // Même id que la note mise en cache lors de la saisie hors-ligne
        // (voir handleSubmit) : on peut donc la retirer directement. Le
        // prochain loadGrades() ira chercher la vraie version côté serveur.
        await db.grades.delete(item.id);
        anySynced = true;
      } catch (error) {
        if (!error.response) {
          break;
        }

        await db.syncQueue.update(item.id, { status: "failed" });
      }
    }

    await refreshQueuedCount();

    if (anySynced) {
      await loadGrades();
    }
  }

  useEffect(() => {
    flushGradeQueue();

    window.addEventListener("online", flushGradeQueue);

    return () => {
      window.removeEventListener("online", flushGradeQueue);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      setStudentsError(null);

      // allSettled : une panne réseau touche les 3 requêtes à la fois, mais
      // on veut quand même laisser loadGrades() et le cache élèves faire
      // leur travail plutôt que de tout interrompre au premier rejet.
      await Promise.allSettled([
        api.get(`/assignments/${assignmentId}`).then((r) => setAssignment(r.data)),
        api
          .get(`/assignments/${assignmentId}/students`)
          .then((r) => setStudentsData(r.data))
          .catch((err) => {
            setStudentsError(
              err.response?.data?.message || "Impossible de charger les élèves.",
            );
          }),
        loadGrades(),
      ]);

      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  function handleTypeChange(value) {
    setForm((prev) => ({ ...prev, evaluation_type: value }));
  }

  function studentName(g) {
    return (
      g.student?.fullname ??
      students.find((s) => s.student_id === g.student_id)?.student?.fullname ??
      "…"
    );
  }

  function seasonLabel(g) {
    return g.season?.label ?? seasons.find((s) => s.id === g.season_id)?.label;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await api.post(`/assignments/${assignmentId}/grades`, form);
      // Recharge depuis le serveur (plutôt qu'un ajout optimiste local) pour
      // garder le tri par date décroissante géré côté back-end, et pour que
      // le cache Dexie reste à jour au passage (voir loadGrades).
      await loadGrades();
      setForm((prev) => ({
        ...emptyForm(),
        student_id: prev.student_id,
        season_id: prev.season_id,
      }));
    } catch (err) {
      if (!err.response) {
        // Hors-ligne : on enregistre la note localement (pending: true) et on
        // la met en file d'attente. Même id des deux côtés (voir
        // flushGradeQueue) pour pouvoir nettoyer la version locale une fois
        // envoyée.
        const tempId = crypto.randomUUID();
        const localGrade = {
          id: tempId,
          assignmentId,
          pending: true,
          student_id: form.student_id,
          season_id: form.season_id,
          evaluation_type: form.evaluation_type,
          title: form.title,
          score: form.score,
          max_score: form.max_score,
          graded_at: form.graded_at,
        };

        await db.grades.put(localGrade);
        await db.syncQueue.add({
          id: tempId,
          type: "grade",
          status: "pending",
          createdAt: Date.now(),
          payload: { assignmentId, form },
        });

        setGrades((prev) => [localGrade, ...prev]);
        await refreshQueuedCount();
        setForm((prev) => ({
          ...emptyForm(),
          student_id: prev.student_id,
          season_id: prev.season_id,
        }));
        setSuccess("Pas de connexion : note enregistrée localement.");
      } else {
        const messages = err.response?.data?.errors;
        setError(
          messages
            ? Object.values(messages).flat().join(" ")
            : "Impossible d'ajouter cette note.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/dashboard/my-assignments"
        sx={{ mb: 2 }}
      >
        ← Retour à mes cours
      </Button>

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          Saisie des notes
        </Typography>
        {queuedCount > 0 && (
          <Chip
            size="small"
            color="warning"
            label={`${queuedCount} en attente d'envoi`}
          />
        )}
      </Stack>
      {assignment && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {assignment.subject.name} · {assignment.school_class.name}
          {assignment.school_class.level
            ? ` (${assignment.school_class.level.name})`
            : ""}
        </Typography>
      )}

      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadError}
        </Alert>
      )}
      {studentsError && cachedStudents.length === 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {studentsError}
        </Alert>
      )}
      {studentsError && cachedStudents.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Connexion indisponible : liste des élèves affichée depuis le cache
          local.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ajouter une note
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                select
                label="Trimestre / semestre"
                value={form.season_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, season_id: e.target.value }))
                }
                helperText={
                  seasons.length === 0
                    ? "Aucune période scolaire configurée pour cette école."
                    : ""
                }
                disabled={seasons.length === 0}
                required
                fullWidth
              >
                {seasons.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
              <Autocomplete
                options={students}
                getOptionLabel={(s) => s.student.fullname}
                isOptionEqualToValue={(option, value) =>
                  option.student_id === value.student_id
                }
                value={
                  students.find((s) => s.student_id === form.student_id) ?? null
                }
                onChange={(_, newValue) =>
                  setForm((prev) => ({
                    ...prev,
                    student_id: newValue?.student_id ?? "",
                  }))
                }
                renderInput={(params) => (
                  <TextField {...params} label="Élève" required />
                )}
                noOptionsText="Aucun élève trouvé"
                fullWidth
              />
              <TextField
                select
                label="Type d'évaluation"
                value={form.evaluation_type}
                onChange={(e) => handleTypeChange(e.target.value)}
                required
                fullWidth
              >
                {EVALUATION_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Titre (optionnel)"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Note"
                  type="number"
                  value={form.score}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, score: e.target.value }))
                  }
                  required
                  fullWidth
                />
                <TextField
                  label="Barème"
                  type="number"
                  value={form.max_score}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, max_score: e.target.value }))
                  }
                  fullWidth
                />
              </Stack>
              <TextField
                label="Date"
                type="date"
                value={form.graded_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, graded_at: e.target.value }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? "Ajout..." : "Ajouter la note"}
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h6" gutterBottom>
            Notes saisies
          </Typography>
          <Stack spacing={1.5}>
            {grades.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card variant="outlined">
                  <CardContent
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2">
                          {studentName(g)}
                        </Typography>
                        {g.pending && (
                          <Chip
                            label="En attente d'envoi"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {g.title || g.evaluation_type} ·{" "}
                        {new Date(g.graded_at).toLocaleDateString("fr-FR")}
                        {seasonLabel(g) ? ` · ${seasonLabel(g)}` : ""}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={g.evaluation_type}
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="h6">
                        {g.score}/{g.max_score}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {grades.length === 0 && (
              <Typography color="text.secondary">
                Aucune note saisie pour l'instant.
              </Typography>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
