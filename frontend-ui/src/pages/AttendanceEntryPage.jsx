import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "motion/react";
import { Link as RouterLink, useParams } from "react-router-dom";
import api from "../api/axios.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { db } from "../offline/db.js";

const STATUS_OPTIONS = [
  { value: 1, label: "Présent" },
  { value: 0, label: "Absent" },
  { value: 2, label: "Retard" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Clé déterministe pour une ligne db.attendances : toujours la même pour un
// (assignment, date, élève) donné, qu'elle vienne du serveur (loadAttendance)
// ou d'une saisie locale pas encore synchronisée (handleSubmit hors-ligne).
// Sans ça on aurait deux lignes différentes pour la même présence — l'une
// gardant l'id réel renvoyé par Laravel, l'autre un id local — et la
// deuxième ne serait jamais nettoyée après la synchro.
function attendanceCacheId(assignmentId, date, studentId) {
  return `${assignmentId}_${date}_${studentId}`;
}

export default function AttendanceEntryPage() {
  const { assignmentId } = useParams();
  const {
    data: studentsData,
    loading,
    error: studentsError,
  } = useApiGet(`/assignments/${assignmentId}/students`);
  // Hors-ligne (ou juste après une panne), on retombe sur la dernière liste
  // d'élèves connue pour cette classe plutôt que sur un écran vide.
  const [date, setDate] = useState(todayISO());
  const [statuses, setStatuses] = useState({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [queuedCount, setQueuedCount] = useState(0);
  const [cachedStudents, setCachedStudents] = useState([]);
  const students = studentsData ?? cachedStudents;

  // Recompte les présences en attente d'envoi dans Dexie. On filtre sur
  // type ET status : syncQueue est une table générique (le champ `type`
  // existe pour qu'elle serve aussi à d'autres écrans hors-ligne plus tard),
  // donc il ne faut compter/traiter que nos propres entrées ici.
  async function refreshQueuedCount() {
    const count = await db.syncQueue
      .where({ type: "attendance", status: "pending" })
      .count();
    setQueuedCount(count);
  }

  useEffect(() => {
    async function loadLocalRoster() {
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

  // Dès que la liste d'élèves arrive du serveur, on la recopie dans Dexie
  // (put = créer ou remplacer selon la clé primaire `id`) pour qu'elle
  // reste disponible hors-ligne la prochaine fois qu'on ouvre cette page.
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

  // Envoie au serveur chaque présence encore en attente dans syncQueue,
  // appelé au montage et à chaque retour de connexion (évènement "online").
  async function flushAttendanceQueue() {
    const pending = await db.syncQueue
      .where({ type: "attendance", status: "pending" })
      .toArray();

    for (const item of pending) {
      try {
        await api.post(
          `/assignments/${item.payload.assignmentId}/attendances`,
          {
            date: item.payload.date,
            records: item.payload.records,
          },
        );

        // Envoyé avec succès : plus besoin de la garder dans la file.
        await db.syncQueue.delete(item.id);
      } catch (error) {
        if (!error.response) {
          // Toujours hors ligne (pas de réponse serveur du tout) : inutile
          // d'essayer les entrées suivantes, elles échoueront pareil.
          break;
        }

        // Réponse serveur reçue mais en erreur (ex: validation) : ce n'est
        // pas un problème réseau qui se résoudra tout seul, on arrête de
        // réessayer cette entrée en la marquant "failed" plutôt que de la
        // retenter indéfiniment à chaque retour de connexion.
        await db.syncQueue.update(item.id, {
          status: "failed",
        });
      }
    }

    await refreshQueuedCount();
  }

  useEffect(() => {
    flushAttendanceQueue();

    window.addEventListener("online", flushAttendanceQueue);

    return () => {
      window.removeEventListener("online", flushAttendanceQueue);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAttendance(forDate) {
    setLoadingAttendance(true);
    setAttendanceError(null);

    try {
      // 1. Chercher d'abord en local. .where({assignmentId, date}) est une
      // requête sur deux champs à la fois : Dexie s'appuie sur l'index
      // déclaré pour l'un des deux (assignmentId ici) puis filtre le reste
      // en mémoire — plus direct que .where().equals().filter() pour
      // exprimer "les deux conditions doivent être vraies".
      const localAttendance = await db.attendances
        .where({ assignmentId, date: forDate })
        .toArray();

      if (localAttendance.length > 0) {
        const map = {};

        localAttendance.forEach((a) => {
          map[a.student_id] = a.status;
        });

        setStatuses(map);
      }

      // 2. Si Internet disponible,
      // récupérer la version serveur
      if (navigator.onLine) {
        const response = await api.get(
          `/assignments/${assignmentId}/attendances`,
          {
            params: {
              date: forDate,
            },
          },
        );

        // 3. Mettre à jour Dexie. On utilise attendanceCacheId (et pas
        // l'id renvoyé par Laravel) comme clé primaire : c'est la même
        // clé qu'une saisie hors-ligne pas encore synchronisée utiliserait
        // pour ce même élève/cette même date (voir handleSubmit) — donc
        // put() écrase bien la même ligne au lieu d'en créer une deuxième.
        for (const attendance of response.data) {
          await db.attendances.put({
            id: attendanceCacheId(assignmentId, forDate, attendance.student_id),
            assignmentId,
            student_id: attendance.student_id,
            date: forDate,
            status: attendance.status,
          });
        }

        // 4. Mettre à jour React
        const map = {};

        response.data.forEach((a) => {
          map[a.student_id] = a.status;
        });

        setStatuses(map);
      }
    } catch (err) {
      // Si on a déjà des données locales,
      // on peut continuer à travailler hors ligne.

      if (!navigator.onLine) {
        return;
      }

      setAttendanceError(
        err.response?.data?.message || "Impossible de charger les présences.",
      );
    } finally {
      setLoadingAttendance(false);
    }
  }

  useEffect(() => {
    if (!date) return;

    loadAttendance(date);
  }, [assignmentId, date]);

  function setStudentStatus(studentId, status) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const records = students.map((s) => ({
      student_id: s.student_id,
      status: statuses[s.student_id] ?? 1,
    }));

    try {
      await api.post(`/assignments/${assignmentId}/attendances`, {
        date,
        records,
      });

      setSuccess("Présences enregistrées.");
    } catch (err) {
      if (!err.response) {
        // bulkPut (et pas add) avec attendanceCacheId : si l'utilisateur
        // recharge la page pendant qu'on est encore hors-ligne, statuses
        // se repeuple depuis ces mêmes lignes (voir loadAttendance) au lieu
        // de revenir à la dernière version connue du serveur — sinon la
        // saisie affichée serait perdue même si l'envoi reste bien en
        // attente dans syncQueue.
        await db.attendances.bulkPut(
          records.map((r) => ({
            id: attendanceCacheId(assignmentId, date, r.student_id),
            assignmentId,
            student_id: r.student_id,
            date,
            status: r.status,
          })),
        );

        await db.syncQueue.add({
          id: crypto.randomUUID(),
          type: "attendance",
          status: "pending",
          createdAt: Date.now(),

          payload: {
            assignmentId,
            date,
            records,
          },
        });

        await refreshQueuedCount();

        setSuccess("Pas de connexion : présences enregistrées localement.");
      } else {
        const messages = err.response?.data?.errors;

        setError(
          messages
            ? Object.values(messages).flat().join(" ")
            : "Impossible d'enregistrer les présences.",
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
          Saisie des présences
        </Typography>
        {queuedCount > 0 && (
          <Chip
            size="small"
            color="warning"
            label={`${queuedCount} en attente d'envoi`}
          />
        )}
      </Stack>

      {studentsError && cachedStudents.length === 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {studentsError}
        </Alert>
      )}
      {studentsError && cachedStudents.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Connexion indisponible : liste des élèves affichée depuis le cache
          local.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }}>
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ mb: 3 }}
          fullWidth
        />

        {attendanceError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {attendanceError}
          </Alert>
        )}
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

        {loadingAttendance ? (
          <p>Chargement...</p>
        ) : (
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {students.map((s, i) => (
              <motion.div
                key={s.student_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card variant="outlined">
                  <CardContent
                    sx={{ display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                      {s.student?.fullname}
                    </Typography>
                    <TextField
                      select
                      size="small"
                      value={statuses[s.student_id] ?? 1}
                      onChange={(e) =>
                        setStudentStatus(s.student_id, Number(e.target.value))
                      }
                      sx={{ width: 160 }}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {students.length === 0 && (
              <Typography color="text.secondary">
                Aucun élève inscrit dans cette classe.
              </Typography>
            )}
          </Stack>
        )}

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || students.length === 0}
          fullWidth
        >
          {submitting ? "Enregistrement..." : "Enregistrer les présences"}
        </Button>
      </Paper>
    </Box>
  );
}
