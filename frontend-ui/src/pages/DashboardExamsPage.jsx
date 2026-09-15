import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { useSchools } from "../hooks/useSchools.js";
import { getSchoolAdminAccess } from "../utils/schoolAdminAccess.js";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function toInputDate(value) {
  return value ? value.slice(0, 10) : "";
}

function getExamModeLabel(mode) {
  return mode === "blanc" ? "Blanc" : "Passage";
}

function getCandidateClassLabel(candidate) {
  const section = candidate?.school_class?.level?.section?.name;
  const level = candidate?.school_class?.level?.name;
  const className = candidate?.school_class?.name;

  return (
    [section, level, className].filter(Boolean).join(" · ") || "Classe inconnue"
  );
}

export default function DashboardExamsPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const { schoolUsers } = useSchools();
  const currentMembership = schoolUsers.find(
    (membership) => membership.school?.id === schoolId,
  );
  const { roleSlug, isAdmin } = getSchoolAdminAccess(currentMembership);
  const canManageExamForm = isAdmin;
  const canGradeExam = isAdmin || roleSlug === "professeur";
  const canDownloadCandidates =
    roleSlug === "professeur" ||
    ["admin", "secretaire", "censeur", "comptable"].includes(roleSlug);

  const examTypesQuery = useApiGet(
    schoolId ? `/schools/${schoolId}/exam-types` : null,
  );
  const schoolYearsQuery = useApiGet(
    schoolId ? `/schools/${schoolId}/school-years` : null,
  );
  const classesQuery = useApiGet(
    schoolId ? `/schools/${schoolId}/classes` : null,
    { params: { per_page: 1000 } },
  );
  const examsQuery = useApiGet(schoolId ? `/schools/${schoolId}/exams` : null);
  const subjectsQuery = useApiGet("/subjects");

  const [typeForm, setTypeForm] = useState({
    name: "",
    code: "",
    description: "",
    is_active: true,
  });
  const [typeError, setTypeError] = useState(null);
  const [typeSubmitting, setTypeSubmitting] = useState(false);

  const [examForm, setExamForm] = useState({
    exam_type_id: "",
    school_year_id: "",
    exam_mode: "passage",
    name: "",
    start_date: "",
    end_date: "",
    status: "draft",
    is_published: false,
    remarks: "",
  });
  const [examError, setExamError] = useState(null);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [candidatePanelExamId, setCandidatePanelExamId] = useState(null);
  const [candidateSelections, setCandidateSelections] = useState({});
  const [candidateGeneratingId, setCandidateGeneratingId] = useState(null);
  const [candidateMessage, setCandidateMessage] = useState(null);
  const [editingExamId, setEditingExamId] = useState(null);
  const [deletingExamId, setDeletingExamId] = useState(null);
  const [examModeFilter, setExamModeFilter] = useState("all");
  const [gradingExamId, setGradingExamId] = useState(null);
  const [gradingSubjectId, setGradingSubjectId] = useState("");
  const [gradingNotes, setGradingNotes] = useState({});
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingSaving, setGradingSaving] = useState(false);
  const [gradingError, setGradingError] = useState(null);
  const [gradingSuccess, setGradingSuccess] = useState(null);
  const [downloadClassSelections, setDownloadClassSelections] = useState({});
  const [programPanelExamId, setProgramPanelExamId] = useState(null);
  const [programForm, setProgramForm] = useState({});
  const [programMessage, setProgramMessage] = useState(null);
  const [programSavingId, setProgramSavingId] = useState(null);

  const examTypes = examTypesQuery.data ?? [];
  const schoolYears = schoolYearsQuery.data ?? [];
  const exams = examsQuery.data ?? [];
  const classes = classesQuery.data?.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const filteredExams =
    examModeFilter === "all"
      ? exams
      : exams.filter(
          (exam) => (exam.exam_mode ?? "passage") === examModeFilter,
        );

  const hasTypeNameError = Boolean(typeError) && !typeForm.name.trim();
  const hasExamTypeError = Boolean(examError) && !examForm.exam_type_id.trim();
  const hasExamNameError = Boolean(examError) && !examForm.name.trim();

  function onTypeFieldChange(event) {
    const { name, value, type, checked } = event.target;
    setTypeForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function onExamFieldChange(event) {
    const { name, value, type, checked } = event.target;
    setExamForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function toggleCandidateSelection(examId, classId) {
    setCandidateSelections((current) => {
      const next = new Set(current[examId] ?? []);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }

      return {
        ...current,
        [examId]: Array.from(next),
      };
    });
  }

  function updateGradingField(candidateId, field, value) {
    setGradingNotes((current) => ({
      ...current,
      [candidateId]: {
        ...(current[candidateId] ?? {}),
        [field]: value,
      },
    }));
  }

  async function loadGradingData(exam, subjectId) {
    if (!subjectId) {
      setGradingNotes({});
      return;
    }

    setGradingLoading(true);
    setGradingError(null);

    try {
      const nextNotes = {};

      for (const candidate of exam.exam_candidates ?? []) {
        const response = await api.get(
          `/schools/${schoolId}/exams/${exam.id}/candidates/${candidate.id}/subjects`,
        );

        const matchingSubject = (response.data ?? []).find(
          (item) => item.exam_subject_id === subjectId,
        );

        nextNotes[candidate.id] = {
          existingId: matchingSubject?.id ?? null,
          score: matchingSubject?.score ?? "",
          score_out_of: matchingSubject?.score_out_of ?? "",
          is_absent: Boolean(matchingSubject?.is_absent),
          remark: matchingSubject?.remark ?? "",
        };
      }

      setGradingNotes(nextNotes);
    } catch (error) {
      const messages = error.response?.data?.errors;
      setGradingError(
        messages
          ? Object.values(messages).flat().join(" ")
          : error.response?.data?.message ||
              "Impossible de charger les notes de cette épreuve.",
      );
    } finally {
      setGradingLoading(false);
    }
  }

  async function openGradingPanel(exam) {
    const firstSubjectId = exam.exam_subjects?.[0]?.id || "";

    setGradingExamId(exam.id);
    setGradingSubjectId(firstSubjectId);
    setGradingError(null);
    setGradingSuccess(null);

    if (!firstSubjectId) {
      setGradingError("Aucune épreuve n’a encore été ajoutée à cet examen.");
      return;
    }

    await loadGradingData(exam, firstSubjectId);
  }

  async function saveGradingNotes(exam) {
    if (!gradingSubjectId) {
      return;
    }

    setGradingSaving(true);
    setGradingError(null);
    setGradingSuccess(null);

    try {
      for (const candidate of exam.exam_candidates ?? []) {
        const note = gradingNotes[candidate.id] ?? {};
        const hasInput =
          note.score !== "" ||
          note.score_out_of !== "" ||
          note.is_absent ||
          (note.remark ?? "").trim() !== "";

        if (!hasInput) {
          continue;
        }

        const payload = {
          exam_subject_id: gradingSubjectId,
          score: note.score === "" ? null : note.score,
          score_out_of: note.score_out_of === "" ? null : note.score_out_of,
          is_absent: note.is_absent ?? false,
          remark: note.remark ?? "",
        };

        if (note.existingId) {
          await api.put(
            `/schools/${schoolId}/exams/${exam.id}/candidates/${candidate.id}/subjects/${note.existingId}`,
            payload,
          );
        } else {
          await api.post(
            `/schools/${schoolId}/exams/${exam.id}/candidates/${candidate.id}/subjects`,
            payload,
          );
        }
      }

      setGradingSuccess("Les notes ont bien été enregistrées.");
      await loadGradingData(exam, gradingSubjectId);
    } catch (error) {
      const messages = error.response?.data?.errors;
      setGradingError(
        messages
          ? Object.values(messages).flat().join(" ")
          : error.response?.data?.message ||
              "Impossible d’enregistrer les notes.",
      );
    } finally {
      setGradingSaving(false);
    }
  }

  async function generateCandidates(exam) {
    setCandidateGeneratingId(exam.id);
    setCandidateMessage(null);

    try {
      const payload = {
        school_class_ids:
          (candidateSelections[exam.id] ?? []).length > 0
            ? candidateSelections[exam.id]
            : undefined,
      };

      const response = await api.post(
        `/schools/${schoolId}/exams/${exam.id}/candidates/generate`,
        payload,
      );

      setCandidateMessage({
        examId: exam.id,
        text:
          response.data?.message ||
          `Candidats générés : ${response.data?.created ?? 0}.`,
      });
      await examsQuery.reload();
      setCandidatePanelExamId(null);
    } catch (error) {
      const messages = error.response?.data?.errors;
      setCandidateMessage({
        examId: exam.id,
        text: messages
          ? Object.values(messages).flat().join(" ")
          : error.response?.data?.message ||
            "Impossible de générer les candidats.",
      });
    } finally {
      setCandidateGeneratingId(null);
    }
  }

  function getDefaultProgramForm() {
    return {
      subject_id: "",
      school_class_id: "",
      exam_date: "",
      start_time: "",
      end_time: "",
      coefficient: 1,
      max_score: 20,
      order: 0,
      is_mandatory: true,
    };
  }

  function updateProgramField(examId, field, value) {
    setProgramForm((current) => ({
      ...current,
      [examId]: {
        ...(current[examId] ?? getDefaultProgramForm()),
        [field]: value,
      },
    }));
  }

  async function submitProgram(exam) {
    const examProgramForm = programForm[exam.id] ?? getDefaultProgramForm();

    if (!examProgramForm.subject_id) {
      setProgramMessage({
        examId: exam.id,
        severity: "error",
        text: "Veuillez sélectionner une matière pour le programme.",
      });
      return;
    }

    if (exam.exam_mode === "passage" && !examProgramForm.school_class_id) {
      setProgramMessage({
        examId: exam.id,
        severity: "error",
        text: "Veuillez sélectionner une classe pour le programme d’un examen de passage.",
      });
      return;
    }

    setProgramSavingId(exam.id);
    setProgramMessage(null);

    try {
      const payload = {
        subject_id: examProgramForm.subject_id,
        school_class_id:
          exam.exam_mode === "passage"
            ? examProgramForm.school_class_id || null
            : null,
        coefficient:
          examProgramForm.coefficient === ""
            ? 1
            : Number(examProgramForm.coefficient),
        max_score:
          examProgramForm.max_score === ""
            ? 20
            : Number(examProgramForm.max_score),
        order: examProgramForm.order === "" ? 0 : Number(examProgramForm.order),
        is_mandatory: Boolean(examProgramForm.is_mandatory),
        exam_date: examProgramForm.exam_date || null,
        start_time: examProgramForm.start_time || null,
        end_time: examProgramForm.end_time || null,
      };

      await api.post(`/schools/${schoolId}/exams/${exam.id}/subjects`, payload);

      setProgramForm((current) => ({
        ...current,
        [exam.id]: getDefaultProgramForm(),
      }));
      setProgramMessage({
        examId: exam.id,
        severity: "success",
        text: "L’épreuve a bien été ajoutée au programme.",
      });
      await examsQuery.reload();
    } catch (error) {
      const messages = error.response?.data?.errors;
      setProgramMessage({
        examId: exam.id,
        severity: "error",
        text: messages
          ? Object.values(messages).flat().join(" ")
          : error.response?.data?.message ||
            "Impossible d’ajouter cette épreuve au programme.",
      });
    } finally {
      setProgramSavingId(null);
    }
  }

  async function deleteProgram(exam, examSubject) {
    setProgramSavingId(exam.id);
    setProgramMessage(null);

    try {
      await api.delete(
        `/schools/${schoolId}/exams/${exam.id}/subjects/${examSubject.id}`,
      );

      setProgramMessage({
        examId: exam.id,
        severity: "success",
        text: "L’épreuve a bien été supprimée du programme.",
      });
      await examsQuery.reload();
    } catch (error) {
      const messages = error.response?.data?.errors;
      setProgramMessage({
        examId: exam.id,
        severity: "error",
        text: messages
          ? Object.values(messages).flat().join(" ")
          : error.response?.data?.message ||
            "Impossible de supprimer cette épreuve.",
      });
    } finally {
      setProgramSavingId(null);
    }
  }

  function downloadCandidateListPdf(exam, selectedClassId = "all") {
    const allCandidates = exam.exam_candidates ?? [];
    const selectedClassCandidates =
      selectedClassId === "all"
        ? allCandidates
        : allCandidates.filter(
            (candidate) => candidate.school_class_id === selectedClassId,
          );

    if (selectedClassCandidates.length === 0) {
      setCandidateMessage({
        examId: exam.id,
        text: "Aucune candidature disponible pour cette classe dans cet examen.",
      });
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const modeLabel = getExamModeLabel(exam.exam_mode);
    const targetLabel =
      selectedClassId === "all"
        ? "Tout"
        : getCandidateClassLabel(
            selectedClassCandidates[0] ?? allCandidates[0],
          );

    doc.setFontSize(18);
    doc.text("Liste des candidats", 14, 18);

    doc.setFontSize(10);
    doc.text(`Examen : ${exam.name || "—"}`, 14, 28);
    doc.text(`Type : ${exam.exam_type?.name || "—"}`, 14, 34);
    doc.text(`Mode : ${modeLabel}`, 14, 40);
    doc.text(`Cible : ${targetLabel}`, 14, 46);
    doc.text(
      `Période : ${formatDate(exam.start_date)} au ${formatDate(exam.end_date)}`,
      14,
      52,
    );

    const subjectRows = (exam.exam_subjects ?? []).map((examSubject, index) => [
      index + 1,
      examSubject.subject?.name || "—",
      formatDate(examSubject.exam_date),
      examSubject.start_time ? examSubject.start_time.slice(0, 5) : "—",
      examSubject.end_time ? examSubject.end_time.slice(0, 5) : "—",
    ]);

    doc.setFontSize(11);
    doc.text("Programme", 14, 62);

    if (subjectRows.length > 0) {
      autoTable(doc, {
        startY: 66,
        head: [["N°", "Matière", "Date", "Début", "Fin"]],
        body: subjectRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [39, 94, 156], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });
    } else {
      doc.text("Aucune matière programmée pour cet examen.", 14, 68);
    }

    const rows = selectedClassCandidates.map((candidate, index) => [
      index + 1,
      candidate.student?.fullname || "—",
      candidate.candidate_number || "—",
      candidate.school_class?.level?.section?.name || "—",
      candidate.school_class?.level?.name || "—",
      candidate.school_class?.name || "—",
      candidate.is_absent ? "Absent" : "Présent",
    ]);

    const candidateTableStartY = subjectRows.length > 0 ? 86 : 74;

    autoTable(doc, {
      startY: candidateTableStartY,
      head: [
        ["N°", "Nom", "N° candidat", "Section", "Niveau", "Classe", "Présence"],
      ],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [39, 94, 156], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    const safeName =
      (exam.name || "examens")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "examens";

    const fileSuffix =
      selectedClassId === "all"
        ? "tous"
        : targetLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    doc.save(`${safeName}-candidats-${fileSuffix}.pdf`);
  }

  async function submitType(event) {
    event.preventDefault();
    const trimmedName = typeForm.name.trim();

    if (!trimmedName) {
      setTypeError("Le nom du type d’examen est requis.");
      return;
    }

    setTypeError(null);
    setTypeSubmitting(true);

    try {
      await api.post(`/schools/${schoolId}/exam-types`, {
        ...typeForm,
        name: trimmedName,
      });
      setTypeForm({
        name: "",
        code: "",
        description: "",
        is_active: true,
      });
      await examTypesQuery.reload();
    } catch (error) {
      const messages = error.response?.data?.errors;
      setTypeError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible de créer ce type d’examen.",
      );
    } finally {
      setTypeSubmitting(false);
    }
  }

  function resetExamForm() {
    setExamForm({
      exam_type_id: "",
      school_year_id: "",
      exam_mode: "passage",
      name: "",
      start_date: "",
      end_date: "",
      status: "draft",
      is_published: false,
      remarks: "",
    });
    setEditingExamId(null);
  }

  function startEditExam(exam) {
    setEditingExamId(exam.id);
    setExamForm({
      exam_type_id: exam.exam_type?.id ?? "",
      school_year_id: exam.school_year?.id ?? "",
      exam_mode: exam.exam_mode ?? "passage",
      name: exam.name ?? "",
      start_date: toInputDate(exam.start_date),
      end_date: toInputDate(exam.end_date),
      status: exam.status ?? "draft",
      is_published: Boolean(exam.is_published),
      remarks: exam.remarks ?? "",
    });
    setExamError(null);
  }

  async function submitExam(event) {
    event.preventDefault();
    const trimmedName = examForm.name.trim();
    const trimmedExamTypeId = examForm.exam_type_id.trim();

    if (!trimmedExamTypeId || !trimmedName) {
      setExamError("Le type d’examen et le nom de l’examen sont requis.");
      return;
    }

    setExamError(null);
    setExamSubmitting(true);

    try {
      if (editingExamId) {
        await api.put(`/schools/${schoolId}/exams/${editingExamId}`, {
          ...examForm,
          exam_type_id: trimmedExamTypeId,
          name: trimmedName,
          school_year_id: examForm.school_year_id || null,
        });
      } else {
        await api.post(`/schools/${schoolId}/exams`, {
          ...examForm,
          exam_type_id: trimmedExamTypeId,
          name: trimmedName,
          school_year_id: examForm.school_year_id || null,
        });
      }

      resetExamForm();
      await examsQuery.reload();
    } catch (error) {
      const messages = error.response?.data?.errors;
      setExamError(
        messages
          ? Object.values(messages).flat().join(" ")
          : editingExamId
            ? "Impossible de modifier cet examen."
            : "Impossible de créer cet examen.",
      );
    } finally {
      setExamSubmitting(false);
    }
  }

  async function deleteExam(exam) {
    const confirmed = window.confirm(
      `Supprimer l’examen "${exam.name}" ? Cette action est irréversible.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingExamId(exam.id);
    setExamError(null);

    try {
      await api.delete(`/schools/${schoolId}/exams/${exam.id}`);
      if (editingExamId === exam.id) {
        resetExamForm();
      }
      await examsQuery.reload();
    } catch (error) {
      const messages = error.response?.data?.errors;
      setExamError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible de supprimer cet examen.",
      );
    } finally {
      setDeletingExamId(null);
    }
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (
    examTypesQuery.loading ||
    schoolYearsQuery.loading ||
    classesQuery.loading ||
    examsQuery.loading
  ) {
    return <Typography sx={{ py: 4 }}>Chargement...</Typography>;
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3, flexWrap: "wrap", gap: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Examens
          </Typography>
          <Typography color="text.secondary">
            Gérer les types d’examens, les épreuves et les évaluations de votre
            école.
          </Typography>
        </Box>
      </Stack>

      {canManageExamForm && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          sx={{ mb: 4 }}
        >
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Nouveau type d’examen
              </Typography>
              <Box component="form" onSubmit={submitType} noValidate>
                <Stack spacing={2}>
                  <TextField
                    label="Nom"
                    name="name"
                    value={typeForm.name}
                    onChange={onTypeFieldChange}
                    required
                    error={hasTypeNameError}
                    helperText={
                      hasTypeNameError
                        ? "Le nom du type d’examen est requis."
                        : ""
                    }
                    fullWidth
                  />
                  <TextField
                    label="Code"
                    name="code"
                    value={typeForm.code}
                    onChange={onTypeFieldChange}
                    fullWidth
                  />
                  <TextField
                    label="Description"
                    name="description"
                    value={typeForm.description}
                    onChange={onTypeFieldChange}
                    multiline
                    minRows={3}
                    fullWidth
                  />
                  <TextField
                    select
                    label="Statut"
                    name="is_active"
                    value={typeForm.is_active}
                    onChange={onTypeFieldChange}
                    fullWidth
                  >
                    <MenuItem value={true}>Actif</MenuItem>
                    <MenuItem value={false}>Inactif</MenuItem>
                  </TextField>
                  {typeError && <Alert severity="error">{typeError}</Alert>}
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<AddIcon />}
                    disabled={typeSubmitting}
                  >
                    Enregistrer le type
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {editingExamId ? "Modifier l’examen" : "Nouvel examen"}
              </Typography>
              <Box component="form" onSubmit={submitExam} noValidate>
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Type d’examen"
                    name="exam_type_id"
                    value={examForm.exam_type_id}
                    onChange={onExamFieldChange}
                    required
                    error={hasExamTypeError}
                    helperText={
                      hasExamTypeError ? "Sélectionnez un type d’examen." : ""
                    }
                    fullWidth
                  >
                    {examTypes.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Année scolaire"
                    name="school_year_id"
                    value={examForm.school_year_id}
                    onChange={onExamFieldChange}
                    fullWidth
                  >
                    {schoolYears.map((year) => (
                      <MenuItem key={year.id} value={year.id}>
                        {year.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Mode"
                    name="exam_mode"
                    value={examForm.exam_mode}
                    onChange={onExamFieldChange}
                    fullWidth
                  >
                    <MenuItem value="passage">Passage</MenuItem>
                    <MenuItem value="blanc">Blanc</MenuItem>
                  </TextField>
                  <TextField
                    label="Nom de l’examen"
                    name="name"
                    value={examForm.name}
                    onChange={onExamFieldChange}
                    required
                    error={hasExamNameError}
                    helperText={
                      hasExamNameError ? "Le nom de l’examen est requis." : ""
                    }
                    fullWidth
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Date de début"
                      name="start_date"
                      type="date"
                      value={examForm.start_date}
                      onChange={onExamFieldChange}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                    <TextField
                      label="Date de fin"
                      name="end_date"
                      type="date"
                      value={examForm.end_date}
                      onChange={onExamFieldChange}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    select
                    label="Statut"
                    name="status"
                    value={examForm.status}
                    onChange={onExamFieldChange}
                    fullWidth
                  >
                    <MenuItem value="draft">Brouillon</MenuItem>
                    <MenuItem value="scheduled">Planifié</MenuItem>
                    <MenuItem value="ongoing">En cours</MenuItem>
                    <MenuItem value="closed">Clos</MenuItem>
                  </TextField>
                  <TextField
                    label="Remarques"
                    name="remarks"
                    value={examForm.remarks}
                    onChange={onExamFieldChange}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  {examError && <Alert severity="error">{examError}</Alert>}
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="secondary"
                      startIcon={<AddIcon />}
                      disabled={examSubmitting}
                    >
                      {examSubmitting
                        ? editingExamId
                          ? "Enregistrement..."
                          : "Création..."
                        : editingExamId
                          ? "Enregistrer les modifications"
                          : "Créer l’examen"}
                    </Button>
                    {editingExamId && (
                      <Button
                        variant="outlined"
                        onClick={resetExamForm}
                        disabled={examSubmitting}
                      >
                        Annuler
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">Examens enregistrés</Typography>
          <TextField
            select
            label="Filtrer par mode"
            value={examModeFilter}
            onChange={(event) => setExamModeFilter(event.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">Tous</MenuItem>
            <MenuItem value="passage">Passage</MenuItem>
            <MenuItem value="blanc">Blanc</MenuItem>
          </TextField>
        </Stack>
        <Stack spacing={2}>
          {filteredExams.length === 0 ? (
            <Alert severity="info">
              {examModeFilter === "all"
                ? "Aucun examen n’a encore été créé pour cette école."
                : `Aucun examen ${examModeFilter === "blanc" ? "blanc" : "de passage"} n’a encore été créé pour cette école.`}
            </Alert>
          ) : (
            filteredExams.map((exam) => (
              <Card key={exam.id} variant="outlined">
                <CardContent>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="h6">{exam.name}</Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        {exam.exam_type?.name || "Type inconnu"} ·{" "}
                        {exam.school_year?.label || "Aucune année"} ·{" "}
                        {exam.exam_mode === "blanc" ? "Blanc" : "Passage"}
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      <Chip
                        label={exam.exam_mode === "blanc" ? "Blanc" : "Passage"}
                        color={exam.exam_mode === "blanc" ? "warning" : "info"}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={exam.status}
                        color={exam.is_published ? "success" : "default"}
                        size="small"
                      />
                      {exam.is_published && (
                        <Chip label="Publié" color="primary" size="small" />
                      )}
                    </Stack>
                  </Stack>

                  {candidateMessage?.examId === exam.id && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      {candidateMessage.text}
                    </Alert>
                  )}

                  {programMessage?.examId === exam.id && (
                    <Alert
                      severity={programMessage.severity ?? "success"}
                      sx={{ mt: 2 }}
                    >
                      {programMessage.text}
                    </Alert>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Typography variant="body2">
                      Du {formatDate(exam.start_date)} au{" "}
                      {formatDate(exam.end_date)}
                    </Typography>
                    <Typography variant="body2">
                      {exam.exam_targets?.length ?? 0} cible(s)
                    </Typography>
                    <Typography variant="body2">
                      {exam.exam_subjects?.length ?? 0} épreuve(s)
                    </Typography>
                    <Typography variant="body2">
                      {exam.exam_candidates?.length ?? 0} candidat(s)
                    </Typography>
                  </Stack>

                  {candidatePanelExamId === exam.id && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 2,
                        backgroundColor: "rgba(0,0,0,0.01)",
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Générer les candidats depuis des classes
                      </Typography>

                      {classes.length === 0 ? (
                        <Alert severity="info">
                          Aucune classe n’est disponible pour cette école.
                        </Alert>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 1,
                            width: "100%",
                          }}
                        >
                          {classes.map((schoolClass) => (
                            <Box
                              key={schoolClass.id}
                              sx={{
                                width: { xs: "100%", sm: "auto" },
                                minWidth: 0,
                              }}
                            >
                              <FormControlLabel
                                sx={{
                                  width: "100%",
                                  m: 0,
                                  alignItems: "flex-start",
                                }}
                                control={
                                  <Checkbox
                                    checked={(
                                      candidateSelections[exam.id] ?? []
                                    ).includes(schoolClass.id)}
                                    onChange={() =>
                                      toggleCandidateSelection(
                                        exam.id,
                                        schoolClass.id,
                                      )
                                    }
                                  />
                                }
                                label={
                                  schoolClass.level?.section?.name &&
                                  schoolClass.level?.name
                                    ? `${schoolClass.level.section.name} · ${schoolClass.level.name} · ${schoolClass.name}`
                                    : schoolClass.name
                                }
                              />
                            </Box>
                          ))}
                        </Box>
                      )}

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ mt: 2 }}
                      >
                        <Button
                          variant="contained"
                          onClick={() => generateCandidates(exam)}
                          disabled={candidateGeneratingId === exam.id}
                        >
                          {candidateGeneratingId === exam.id
                            ? "Génération..."
                            : "Générer les candidats"}
                        </Button>
                        <Button
                          variant="text"
                          onClick={() => setCandidatePanelExamId(null)}
                        >
                          Fermer
                        </Button>
                      </Stack>
                    </Box>
                  )}

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ mt: 2, flexWrap: "wrap", alignItems: "center" }}
                  >
                    {canManageExamForm && (
                      <>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setCandidatePanelExamId((current) =>
                              current === exam.id ? null : exam.id,
                            );
                            setCandidateMessage((current) =>
                              current?.examId === exam.id ? null : current,
                            );
                          }}
                        >
                          {candidatePanelExamId === exam.id
                            ? "Masquer les classes"
                            : "Générer candidats"}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setProgramPanelExamId((current) =>
                              current === exam.id ? null : exam.id,
                            );
                            setProgramMessage((current) =>
                              current?.examId === exam.id ? null : current,
                            );
                          }}
                        >
                          {programPanelExamId === exam.id
                            ? "Fermer le programme"
                            : "Gérer le programme"}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => startEditExam(exam)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => deleteExam(exam)}
                          disabled={deletingExamId === exam.id}
                        >
                          {deletingExamId === exam.id
                            ? "Suppression..."
                            : "Supprimer"}
                        </Button>
                      </>
                    )}
                    {canDownloadCandidates && (
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems="center"
                      >
                        {(() => {
                          const classOptions = (
                            exam.exam_candidates ?? []
                          ).reduce((accumulator, candidate) => {
                            if (!candidate.school_class_id) {
                              return accumulator;
                            }

                            const label = getCandidateClassLabel(candidate);

                            if (
                              !accumulator.some(
                                (item) => item.id === candidate.school_class_id,
                              )
                            ) {
                              accumulator.push({
                                id: candidate.school_class_id,
                                label,
                              });
                            }

                            return accumulator;
                          }, []);

                          return classOptions.length > 0 ? (
                            <>
                              <TextField
                                select
                                size="small"
                                label="Classe ciblée"
                                value={
                                  downloadClassSelections[exam.id] ?? "all"
                                }
                                onChange={(event) =>
                                  setDownloadClassSelections((current) => ({
                                    ...current,
                                    [exam.id]: event.target.value,
                                  }))
                                }
                                sx={{ minWidth: 180 }}
                              >
                                <MenuItem value="all">Tout</MenuItem>
                                {classOptions.map((option) => (
                                  <MenuItem key={option.id} value={option.id}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                              <Button
                                variant="contained"
                                size="small"
                                color={
                                  roleSlug === "professeur"
                                    ? "secondary"
                                    : "primary"
                                }
                                startIcon={<DownloadIcon />}
                                onClick={() =>
                                  downloadCandidateListPdf(
                                    exam,
                                    downloadClassSelections[exam.id] ?? "all",
                                  )
                                }
                              >
                                Télécharger la liste
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="contained"
                              size="small"
                              color={
                                roleSlug === "professeur"
                                  ? "secondary"
                                  : "primary"
                              }
                              startIcon={<DownloadIcon />}
                              onClick={() =>
                                downloadCandidateListPdf(exam, "all")
                              }
                            >
                              Télécharger la liste
                            </Button>
                          );
                        })()}
                      </Stack>
                    )}
                    {canGradeExam && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => openGradingPanel(exam)}
                      >
                        Saisir notes
                      </Button>
                    )}
                  </Stack>

                  {programPanelExamId === exam.id && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 2,
                        backgroundColor: "rgba(0,0,0,0.01)",
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Programme de l’examen
                      </Typography>

                      {exam.exam_subjects?.length ? (
                        <Stack spacing={1} sx={{ mb: 2 }}>
                          {exam.exam_subjects.map((examSubject) => (
                            <Card key={examSubject.id} variant="outlined">
                              <CardContent
                                sx={{
                                  py: 1.5,
                                  px: 2,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 2,
                                  flexWrap: "wrap",
                                }}
                              >
                                <Box>
                                  <Typography variant="subtitle2">
                                    {examSubject.subject?.name || "Matière"}
                                  </Typography>
                                  <Typography
                                    color="text.secondary"
                                    variant="body2"
                                  >
                                    {exam.exam_mode === "passage" &&
                                      examSubject.school_class && (
                                        <>
                                          {examSubject.school_class.level
                                            ?.section?.name || ""}{" "}
                                          ·{" "}
                                          {examSubject.school_class.level
                                            ?.name || ""}{" "}
                                          ·{" "}
                                          {examSubject.school_class.name || ""}
                                          <br />
                                        </>
                                      )}
                                    {formatDate(examSubject.exam_date)} ·{" "}
                                    {examSubject.start_time
                                      ? examSubject.start_time.slice(0, 5)
                                      : "—"}{" "}
                                    →{" "}
                                    {examSubject.end_time
                                      ? examSubject.end_time.slice(0, 5)
                                      : "—"}
                                  </Typography>
                                </Box>
                                <Button
                                  variant="text"
                                  color="error"
                                  size="small"
                                  onClick={() =>
                                    deleteProgram(exam, examSubject)
                                  }
                                  disabled={programSavingId === exam.id}
                                >
                                  Supprimer
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      ) : (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Aucun programme n’a encore été ajouté à cet examen.
                        </Alert>
                      )}

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="subtitle2" sx={{ mb: 2 }}>
                        Ajouter une épreuve
                      </Typography>

                      <Stack spacing={2}>
                        {exam.exam_mode === "passage" && (
                          <TextField
                            select
                            label="Classe concernée"
                            value={programForm[exam.id]?.school_class_id ?? ""}
                            onChange={(event) =>
                              updateProgramField(
                                exam.id,
                                "school_class_id",
                                event.target.value,
                              )
                            }
                            fullWidth
                          >
                            <MenuItem value="">Toutes les classes</MenuItem>
                            {classes.map((schoolClass) => (
                              <MenuItem
                                key={schoolClass.id}
                                value={schoolClass.id}
                              >
                                {schoolClass.level?.section?.name &&
                                schoolClass.level?.name
                                  ? `${schoolClass.level.section.name} · ${schoolClass.level.name} · ${schoolClass.name}`
                                  : schoolClass.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        )}

                        <TextField
                          select
                          label="Matière"
                          value={programForm[exam.id]?.subject_id ?? ""}
                          onChange={(event) =>
                            updateProgramField(
                              exam.id,
                              "subject_id",
                              event.target.value,
                            )
                          }
                          fullWidth
                        >
                          {subjects.map((subject) => (
                            <MenuItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </MenuItem>
                          ))}
                        </TextField>

                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={2}
                        >
                          <TextField
                            label="Date"
                            type="date"
                            value={programForm[exam.id]?.exam_date ?? ""}
                            onChange={(event) =>
                              updateProgramField(
                                exam.id,
                                "exam_date",
                                event.target.value,
                              )
                            }
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                          />
                          <TextField
                            label="Heure de début"
                            type="time"
                            value={programForm[exam.id]?.start_time ?? ""}
                            onChange={(event) =>
                              updateProgramField(
                                exam.id,
                                "start_time",
                                event.target.value,
                              )
                            }
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                          />
                          <TextField
                            label="Heure de fin"
                            type="time"
                            value={programForm[exam.id]?.end_time ?? ""}
                            onChange={(event) =>
                              updateProgramField(
                                exam.id,
                                "end_time",
                                event.target.value,
                              )
                            }
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                          />
                        </Stack>

                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={2}
                        >
                          <TextField
                            label="Coefficient"
                            type="number"
                            value={programForm[exam.id]?.coefficient ?? 1}
                            onChange={(event) =>
                              updateProgramField(
                                exam.id,
                                "coefficient",
                                event.target.value,
                              )
                            }
                            fullWidth
                          />
                          <TextField
                            label="Barème"
                            type="number"
                            value={programForm[exam.id]?.max_score ?? 20}
                            onChange={(event) =>
                              updateProgramField(
                                exam.id,
                                "max_score",
                                event.target.value,
                              )
                            }
                            fullWidth
                          />
                          <TextField
                            label="Ordre"
                            type="number"
                            value={programForm[exam.id]?.order ?? 0}
                            onChange={(event) =>
                              updateProgramField(
                                exam.id,
                                "order",
                                event.target.value,
                              )
                            }
                            fullWidth
                          />
                        </Stack>

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(
                                programForm[exam.id]?.is_mandatory ?? true,
                              )}
                              onChange={(event) =>
                                updateProgramField(
                                  exam.id,
                                  "is_mandatory",
                                  event.target.checked,
                                )
                              }
                            />
                          }
                          label="Épreuve obligatoire"
                        />

                        <Button
                          variant="contained"
                          onClick={() => submitProgram(exam)}
                          disabled={programSavingId === exam.id}
                        >
                          {programSavingId === exam.id
                            ? "Ajout en cours..."
                            : "Ajouter l’épreuve"}
                        </Button>
                      </Stack>
                    </Box>
                  )}

                  {gradingExamId === exam.id && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 2,
                        backgroundColor: "rgba(0,0,0,0.01)",
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Notes par épreuve
                      </Typography>

                      {gradingError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {gradingError}
                        </Alert>
                      )}

                      {gradingSuccess && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                          {gradingSuccess}
                        </Alert>
                      )}

                      {exam.exam_subjects?.length ? (
                        <>
                          <TextField
                            select
                            label="Épreuve"
                            value={gradingSubjectId}
                            onChange={async (event) => {
                              const nextSubjectId = event.target.value;
                              setGradingSubjectId(nextSubjectId);
                              await loadGradingData(exam, nextSubjectId);
                            }}
                            fullWidth
                            sx={{ mb: 2 }}
                          >
                            {exam.exam_subjects.map((examSubject) => (
                              <MenuItem
                                key={examSubject.id}
                                value={examSubject.id}
                              >
                                {examSubject.subject?.name || "Épreuve"}
                              </MenuItem>
                            ))}
                          </TextField>

                          {gradingLoading ? (
                            <Typography color="text.secondary">
                              Chargement des notes...
                            </Typography>
                          ) : (
                            <Stack spacing={2}>
                              {(exam.exam_candidates ?? []).map((candidate) => {
                                const note = gradingNotes[candidate.id] ?? {};

                                return (
                                  <Card key={candidate.id} variant="outlined">
                                    <CardContent>
                                      <Stack
                                        direction={{ xs: "column", md: "row" }}
                                        justifyContent="space-between"
                                        spacing={2}
                                      >
                                        <Box>
                                          <Typography variant="subtitle2">
                                            {candidate.student?.fullname ||
                                              "Élève"}
                                          </Typography>
                                          <Typography color="text.secondary">
                                            {candidate.candidate_number ||
                                              "N° candidat non défini"}
                                          </Typography>
                                        </Box>

                                        <Stack
                                          direction={{
                                            xs: "column",
                                            sm: "row",
                                          }}
                                          spacing={1}
                                          sx={{ flex: 1 }}
                                        >
                                          <TextField
                                            label="Note"
                                            type="number"
                                            value={note.score ?? ""}
                                            onChange={(event) =>
                                              updateGradingField(
                                                candidate.id,
                                                "score",
                                                event.target.value,
                                              )
                                            }
                                            fullWidth
                                          />
                                          <TextField
                                            label="Barème"
                                            type="number"
                                            value={note.score_out_of ?? ""}
                                            onChange={(event) =>
                                              updateGradingField(
                                                candidate.id,
                                                "score_out_of",
                                                event.target.value,
                                              )
                                            }
                                            fullWidth
                                          />
                                          <TextField
                                            label="Remarque"
                                            value={note.remark ?? ""}
                                            onChange={(event) =>
                                              updateGradingField(
                                                candidate.id,
                                                "remark",
                                                event.target.value,
                                              )
                                            }
                                            fullWidth
                                          />
                                        </Stack>

                                        <FormControlLabel
                                          control={
                                            <Checkbox
                                              checked={Boolean(note.is_absent)}
                                              onChange={(event) =>
                                                updateGradingField(
                                                  candidate.id,
                                                  "is_absent",
                                                  event.target.checked,
                                                )
                                              }
                                            />
                                          }
                                          label="Absent"
                                        />
                                      </Stack>
                                    </CardContent>
                                  </Card>
                                );
                              })}

                              <Button
                                variant="contained"
                                onClick={() => saveGradingNotes(exam)}
                                disabled={gradingSaving}
                              >
                                {gradingSaving
                                  ? "Enregistrement..."
                                  : "Enregistrer les notes"}
                              </Button>
                            </Stack>
                          )}
                        </>
                      ) : (
                        <Alert severity="info">
                          Ajoutez d’abord au moins une épreuve pour cet examen.
                        </Alert>
                      )}
                    </Box>
                  )}

                  {exam.remarks && (
                    <Typography color="text.secondary" sx={{ mt: 2 }}>
                      {exam.remarks}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      </Box>
    </Box>
  );
}
