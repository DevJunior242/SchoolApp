import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ClassIcon from "@mui/icons-material/Class";
import GroupsIcon from "@mui/icons-material/Groups";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { BarChart } from "@mui/x-charts/BarChart";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { asArray, asObject } from "../utils/apiData.js";
import QuickActions from "../components/QuickActions.jsx";

function StatCard({ icon, label, value, detail }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {icon}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {value}
              </Typography>
              {detail && (
                <Typography variant="caption" color="text.secondary">
                  {detail}
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const { data, loading, error } = useApiGet(
    schoolId ? `/schools/${schoolId}/my-teaching-summary` : null,
  );
  const summary = asObject(data);
  const todaySlots = asArray(summary?.today_slots);
  const averages = asArray(summary?.average_by_class);
  const headcounts = asArray(summary?.class_headcounts);
  const headcountTotal = headcounts.reduce(
    (sum, row) => ({
      garcons: sum.garcons + (row.garcons ?? 0),
      filles: sum.filles + (row.filles ?? 0),
      total: sum.total + (row.total ?? 0),
    }),
    { garcons: 0, filles: 0, total: 0 },
  );

  if (!schoolId) {
    return <Alert severity="info">Aucune école active.</Alert>;
  }

  if (loading) {
    return <LinearProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const pending = summary?.attendance_pending_count ?? 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Mon tableau de bord
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Vos classes, vos cours du jour et les résultats de vos élèves.
      </Typography>
      <QuickActions role="professeur" />

      <Grid container spacing={2}>
        <StatCard
          icon={<ClassIcon color="primary" />}
          label="Mes classes"
          value={summary?.classes_count ?? 0}
          detail={`${summary?.subjects_count ?? 0} matière(s) enseignée(s)`}
        />
        <StatCard
          icon={<GroupsIcon color="info" />}
          label="Mes élèves"
          value={summary?.students_count ?? 0}
          detail="Année scolaire en cours"
        />
        <StatCard
          icon={<FactCheckIcon color={pending > 0 ? "warning" : "success"} />}
          label="Appels à faire aujourd’hui"
          value={pending}
          detail={`${todaySlots.length} cours aujourd’hui`}
        />
        <StatCard
          icon={<EditNoteIcon color="secondary" />}
          label="Notes saisies"
          value={summary?.grades_last_7_days ?? 0}
          detail="7 derniers jours"
        />
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}
            >
              <Typography variant="h6">Mes cours aujourd’hui</Typography>
              <Button size="small" component={RouterLink} to="/dashboard/my-timetable">
                Emploi du temps
              </Button>
            </Stack>
            {todaySlots.length === 0 ? (
              <Typography color="text.secondary">
                Aucun cours prévu aujourd’hui.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {todaySlots.map((slot) => (
                  <Box
                    key={`${slot.assignment_id}-${slot.start_time}`}
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      pb: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={600}>
                        {slot.start_time} – {slot.end_time} · {slot.subject}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {slot.classe}
                        {slot.room ? ` · Salle ${slot.room}` : ""}
                      </Typography>
                    </Box>
                    {slot.attendance_taken ? (
                      <Chip size="small" color="success" label="Appel fait" />
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        component={RouterLink}
                        to={`/dashboard/assignments/${slot.assignment_id}/attendances`}
                      >
                        Faire l’appel
                      </Button>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Moyenne de mes classes
            </Typography>
            {averages.length === 0 ? (
              <Typography color="text.secondary">
                Pas encore de notes saisies cette année.
              </Typography>
            ) : (
              <BarChart
                height={260}
                hideLegend
                borderRadius={4}
                series={[
                  {
                    data: averages.map((row) => Number(row.moyenne)),
                    label: "Moyenne /20",
                    valueFormatter: (value) => (value == null ? "" : `${value}/20`),
                  },
                ]}
                xAxis={[{ scaleType: "band", data: averages.map((row) => row.classe) }]}
                yAxis={[{ min: 0, max: 20 }]}
                grid={{ horizontal: true }}
                margin={{ left: 45, right: 20 }}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Effectif de mes classes
        </Typography>
        {headcounts.length === 0 ? (
          <Typography color="text.secondary">
            Aucune classe attribuée pour l’année en cours.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Classe</TableCell>
                <TableCell align="center">Garçons</TableCell>
                <TableCell align="center">Filles</TableCell>
                <TableCell align="center">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {headcounts.map((row) => (
                <TableRow key={row.classe}>
                  <TableCell>{row.classe}</TableCell>
                  <TableCell align="center">{row.garcons}</TableCell>
                  <TableCell align="center">{row.filles}</TableCell>
                  <TableCell align="center">{row.total}</TableCell>
                </TableRow>
              ))}
              {headcounts.length > 1 && (
                <TableRow sx={{ "& td": { fontWeight: 700 } }}>
                  <TableCell>Total</TableCell>
                  <TableCell align="center">{headcountTotal.garcons}</TableCell>
                  <TableCell align="center">{headcountTotal.filles}</TableCell>
                  <TableCell align="center">{headcountTotal.total}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Box sx={{ mt: 2 }}>
        <Button variant="outlined" component={RouterLink} to="/dashboard/my-assignments">
          Voir tous mes cours (notes, absences, contenus)
        </Button>
      </Box>
    </Box>
  );
}
