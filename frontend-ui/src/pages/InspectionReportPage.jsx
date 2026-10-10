import { Fragment } from "react";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableViewIcon from "@mui/icons-material/TableView";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { asArray, asObject } from "../utils/apiData.js";

// Version standard en attendant le formulaire officiel de l'inspection :
// ajuster les colonnes ici et dans InspectionReportController.
const GROUPS = [
  { key: "effectif", label: "Effectif" },
  { key: "pdi", label: "Dont PDI" },
  { key: "handicap", label: "Dont handicap" },
  { key: "redoublants", label: "Dont redoublants" },
];
const GENDERS = [
  { key: "garcons", label: "G" },
  { key: "filles", label: "F" },
  { key: "total", label: "T" },
];

function rowValues(row) {
  return GROUPS.flatMap((group) =>
    GENDERS.map((gender) => row?.[group.key]?.[gender.key] ?? 0),
  );
}

// Toutes les lignes du rapport, dans l'ordre : classes, total du niveau,
// puis total de l'école.
function reportRows(report) {
  const rows = [];
  for (const level of asArray(report?.levels)) {
    for (const row of asArray(level.classes)) rows.push({ row, kind: "class" });
    rows.push({ row: level.total, kind: "level" });
  }
  if (report?.total) rows.push({ row: report.total, kind: "school" });
  return rows;
}

function disabilityRows(report) {
  const types = asObject(report?.disability_types) ?? {};
  const totals = report?.total?.handicap_types ?? {};
  return [
    ...Object.entries(types).map(([key, label]) => [label, totals[key]]),
    ["Type non précisé", totals.non_precise],
  ].filter(([, counts]) => (counts?.total ?? 0) > 0);
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "";
}

function fileName(report, extension) {
  const school = (report.school_name || "ecole")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  return `rapport-inspection-${school}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function downloadPdf(report) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text(report.school_name || "", 14, 15);
  doc.setFontSize(11);
  doc.text(
    `Rapport des effectifs pour l’inspection · Année scolaire ${report.school_year || "-"} · Édité le ${formatDate(report.generated_at)}`,
    14,
    22,
  );

  autoTable(doc, {
    startY: 28,
    head: [
      [
        { content: "Classe", rowSpan: 2 },
        ...GROUPS.map((group) => ({
          content: group.label,
          colSpan: 3,
          styles: { halign: "center" },
        })),
      ],
      GROUPS.flatMap(() => GENDERS.map((gender) => gender.label)),
    ],
    body: reportRows(report).map(({ row, kind }) => {
      const cells = [row.label, ...rowValues(row)];
      return kind === "class"
        ? cells
        : cells.map((content) => ({ content, styles: { fontStyle: "bold" } }));
    }),
    styles: { fontSize: 9, halign: "center" },
    columnStyles: { 0: { halign: "left" } },
    headStyles: { fillColor: [60, 60, 60] },
  });

  const disabilities = disabilityRows(report);
  if (disabilities.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Handicap par type", "G", "F", "T"]],
      body: disabilities.map(([label, counts]) => [
        label,
        counts?.garcons ?? 0,
        counts?.filles ?? 0,
        counts?.total ?? 0,
      ]),
      styles: { fontSize: 9, halign: "center" },
      columnStyles: { 0: { halign: "left" } },
      headStyles: { fillColor: [60, 60, 60] },
      tableWidth: 110,
    });
  }

  const y = doc.lastAutoTable.finalY + 14;
  doc.setFontSize(10);
  doc.text("Fait à ______________________, le ____ / ____ / ________", 14, y);
  doc.text("Le Directeur / La Directrice (signature et cachet)", 190, y);
  doc.save(fileName(report, "pdf"));
}

// CSV à point-virgule avec BOM : s'ouvre directement dans Excel en français,
// accents compris, sans bibliothèque supplémentaire.
function downloadCsv(report) {
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    [report.school_name],
    [`Année scolaire ${report.school_year || "-"}`, `Édité le ${formatDate(report.generated_at)}`],
    [],
    ["Classe", ...GROUPS.flatMap((group) => GENDERS.map((gender) => `${group.label} ${gender.label}`))],
    ...reportRows(report).map(({ row }) => [row.label, ...rowValues(row)]),
    [],
    ["Handicap par type", "G", "F", "T"],
    ...disabilityRows(report).map(([label, counts]) => [
      label,
      counts?.garcons ?? 0,
      counts?.filles ?? 0,
      counts?.total ?? 0,
    ]),
  ];
  const csv = `\uFEFF${lines.map((line) => line.map(escape).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName(report, "csv");
  link.click();
  URL.revokeObjectURL(url);
}

export default function InspectionReportPage() {
  const { user } = useAuth();
  const schoolId = user?.current_school_id;
  const { data, loading, error } = useApiGet(
    schoolId ? `/schools/${schoolId}/reports/inspection` : null,
  );
  const report = asObject(data);

  if (!schoolId) {
    return <Alert severity="info">Aucune école active.</Alert>;
  }

  if (loading) {
    return <LinearProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const rows = reportRows(report);
  const disabilities = disabilityRows(report);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { md: "center" }, mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Rapport pour l’inspection
          </Typography>
          <Typography color="text.secondary">
            Effectifs de l’année {report?.school_year || "en cours"} par classe :
            garçons, filles, PDI, handicap et redoublants. Uniquement des chiffres,
            aucun nom d’élève.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => downloadPdf(report)}
            disabled={rows.length === 0}
          >
            PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<TableViewIcon />}
            onClick={() => downloadCsv(report)}
            disabled={rows.length === 0}
          >
            Excel
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Les chiffres PDI, handicap et redoublants dépendent de la fiche de chaque
        élève : complétez-la depuis Élèves → ⋮ → « Situation (inspection) ».
      </Alert>

      {rows.length === 0 ? (
        <Typography color="text.secondary">
          Aucune classe pour l’année scolaire en cours.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2}>Classe</TableCell>
                {GROUPS.map((group) => (
                  <TableCell key={group.key} colSpan={3} align="center">
                    {group.label}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                {GROUPS.map((group) => (
                  <Fragment key={group.key}>
                    {GENDERS.map((gender) => (
                      <TableCell key={gender.key} align="center">
                        {gender.label}
                      </TableCell>
                    ))}
                  </Fragment>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ row, kind }, index) => (
                <TableRow
                  key={`${row.label}-${index}`}
                  sx={kind === "class" ? undefined : { bgcolor: "action.hover" }}
                >
                  <TableCell sx={{ fontWeight: kind === "class" ? 400 : 700 }}>
                    {row.label}
                  </TableCell>
                  {rowValues(row).map((value, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      align="center"
                      sx={{ fontWeight: kind === "class" ? 400 : 700 }}
                    >
                      {value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {disabilities.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: 480 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Handicap par type</TableCell>
                {GENDERS.map((gender) => (
                  <TableCell key={gender.key} align="center">
                    {gender.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {disabilities.map(([label, counts]) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  {GENDERS.map((gender) => (
                    <TableCell key={gender.key} align="center">
                      {counts?.[gender.key] ?? 0}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
