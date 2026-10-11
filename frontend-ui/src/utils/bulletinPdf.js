import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Bulletins au format A4 portrait, une page par élève, selon le modèle de la
// section (colonnes, barème, en-tête, signatures). Sert pour un élève et
// pour toute une classe.

const BULLETIN_TYPE_LABELS = {
  trimestre: "Bulletin trimestriel",
  semestre: "Bulletin semestriel",
  annuel: "Bulletin annuel",
};

export function bulletinTitle(bulletin) {
  return BULLETIN_TYPE_LABELS[bulletin?.bulletin_type] ?? "Bulletin";
}

export function formatAverage(value, scale) {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}/${scale}`;
}

export function formatRank(rank, size) {
  if (!rank) return "—";
  return `${rank}${rank === 1 ? "er" : "e"} / ${size}`;
}

/** Colonnes du tableau des matières, selon les cases cochées du modèle. */
export function bulletinColumns(template) {
  const t = template ?? {};
  const scale = t.grading_scale ?? 20;
  return [
    { key: "subject", label: "Matière", value: (s) => s.subject ?? "—" },
    t.show_teacher !== false && { key: "teacher", label: "Professeur", value: (s) => s.teacher ?? "—" },
    t.show_coefficient !== false && { key: "coefficient", label: "Coef.", value: (s) => s.coefficient, align: "center" },
    { key: "average", label: `Moy. /${scale}`, value: (s) => formatAverage(s.average, scale).replace(`/${scale}`, ""), align: "center" },
    t.show_coefficient !== false && {
      key: "weighted",
      label: "Moy. × coef.",
      value: (s) => (s.average == null ? "—" : (s.average * s.coefficient).toLocaleString("fr-FR", { maximumFractionDigits: 2 })),
      align: "center",
    },
    t.show_class_average && { key: "class_average", label: "Moy. classe", value: (s) => formatAverage(s.class_average, scale).replace(`/${scale}`, ""), align: "center" },
    t.show_min_max && { key: "min", label: "Plus faible", value: (s) => formatAverage(s.min, scale).replace(`/${scale}`, ""), align: "center" },
    t.show_min_max && { key: "max", label: "Plus forte", value: (s) => formatAverage(s.max, scale).replace(`/${scale}`, ""), align: "center" },
    t.show_subject_rank && { key: "rank", label: "Rang", value: (s) => (s.rank ? `${s.rank}${s.rank === 1 ? "er" : "e"}` : "—"), align: "center" },
  ].filter(Boolean);
}

/** Lignes du résumé (moyenne, rang, moyenne de classe, distinction, décision). */
export function bulletinSummary(bulletin) {
  const t = bulletin.template ?? {};
  const scale = t.grading_scale ?? 20;
  return [
    ["Moyenne générale", formatAverage(bulletin.overall_average, scale)],
    t.show_rank !== false && ["Rang", formatRank(bulletin.rank, bulletin.class_size)],
    t.show_class_average && ["Moyenne de la classe", formatAverage(bulletin.class_average, scale)],
    bulletin.distinction && ["Distinction", bulletin.distinction],
    bulletin.decision && ["Décision", bulletin.decision],
  ].filter(Boolean);
}

async function loadImage(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    // Logo inaccessible (réseau, autre domaine) : bulletin sans logo.
    return null;
  }
}

function drawBulletin(doc, bulletin, logo) {
  const t = bulletin.template ?? {};
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  if (logo) {
    try {
      doc.addImage(logo, 14, y - 2, 22, 22);
    } catch {
      // Format d'image non pris en charge : on continue sans logo.
    }
  }

  doc.setFontSize(9);
  for (const line of t.header_lines ?? []) {
    doc.text(line, pageWidth / 2, y, { align: "center" });
    y += 4.5;
  }
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text(bulletin.school?.name ?? "", pageWidth / 2, y + 2, { align: "center" });
  doc.setFont(undefined, "normal");
  y += 7;
  if (t.motto) {
    doc.setFontSize(9);
    doc.text(t.motto, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  y = Math.max(y, 34) + 2;

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(`${bulletinTitle(bulletin)} — ${bulletin.period_label ?? ""}`, pageWidth / 2, y, { align: "center" });
  doc.setFont(undefined, "normal");
  y += 7;

  doc.setFontSize(10);
  const student = bulletin.student ?? {};
  doc.text(`Élève : ${student.fullname ?? ""}`, 14, y);
  doc.text(`Classe : ${bulletin.class?.name ?? ""}`, pageWidth - 14, y, { align: "right" });
  y += 5;
  doc.text(
    [student.matricule && `Matricule : ${student.matricule}`, student.date_of_birth && `Né(e) le ${student.date_of_birth}`]
      .filter(Boolean)
      .join("   ·   "),
    14,
    y,
  );
  doc.text(`Année scolaire : ${bulletin.school_year ?? ""}`, pageWidth - 14, y, { align: "right" });
  y += 4;

  const columns = bulletinColumns(t);
  autoTable(doc, {
    startY: y + 2,
    head: [columns.map((column) => column.label)],
    body: (bulletin.subjects ?? []).map((subject) => columns.map((column) => column.value(subject))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [60, 60, 60] },
    columnStyles: Object.fromEntries(
      columns.map((column, index) => [index, { halign: column.align ?? "left" }]),
    ),
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    body: bulletinSummary(bulletin),
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
    tableWidth: 120,
    theme: "grid",
  });

  const signatures = t.signatures ?? [];
  if (signatures.length > 0) {
    const top = doc.lastAutoTable.finalY + 12;
    const width = (pageWidth - 28) / signatures.length;
    doc.setFontSize(10);
    signatures.forEach((label, index) => {
      const x = 14 + index * width;
      doc.text(label, x + width / 2, top, { align: "center" });
      doc.rect(x + 4, top + 3, width - 8, 22);
    });
  }
}

/** Document jsPDF avec une page par bulletin (logo en data URL ou null). */
export function buildBulletinsDoc(bulletins, logo = null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  bulletins.forEach((bulletin, index) => {
    if (index > 0) doc.addPage();
    drawBulletin(doc, bulletin, logo);
  });
  return doc;
}

/** Un PDF avec une page par bulletin, téléchargé par le navigateur. */
export async function downloadBulletinsPdf(bulletins, fileName) {
  if (!bulletins?.length) return;
  const logo = await loadImage(bulletins[0].school?.logo_url);
  buildBulletinsDoc(bulletins, logo).save(fileName);
}

export function bulletinFileName(bulletin, suffix = "") {
  const slug = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  return `bulletin-${slug(suffix || bulletin.student?.fullname)}-${slug(bulletin.period_label)}.pdf`;
}
