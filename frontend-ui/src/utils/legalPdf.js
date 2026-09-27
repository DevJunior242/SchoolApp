// PDF des CGU / de la politique de confidentialité, généré à partir du même
// contenu que la page (legal/content.js) : toujours à jour, sans fichier à
// maintenir. jsPDF est chargé seulement au clic (≈ 300 Ko).

// Les polices intégrées de jsPDF (Helvetica) ne couvrent que le Latin-1 :
// on remplace la typographie qui n'y figure pas.
// Remplacements par code (et non caractère collé) : lisibles et sans espace invisible.
const REPLACEMENTS = [
  [[0x2018, 0x2019, 0x02bc], "'"], // apostrophes typographiques
  [[0x201c, 0x201d], '"'], // guillemets anglais
  [[0x2013, 0x2014], "-"], // tirets moyen et long
  [[0x2026], "..."], // points de suspension
  [[0x0153], "oe"],
  [[0x0152], "OE"],
  [[0x202f, 0x2009], " "], // espaces fines
];
const REPLACEMENT_BY_CODE = new Map(
  REPLACEMENTS.flatMap(([codes, replacement]) => codes.map((code) => [code, replacement])),
);

function latin1(text) {
  return Array.from(String(text), (char) => {
    const code = char.codePointAt(0);
    if (REPLACEMENT_BY_CODE.has(code)) return REPLACEMENT_BY_CODE.get(code);
    return code > 0xff ? "?" : char;
  }).join("");
}

/**
 * @param {object} options
 * @param {string} options.brand     ex. « Intellino RH »
 * @param {object} options.content   { title, intro?, sections: [{ title, blocks }] }
 * @param {string} options.meta      ligne sous le titre (version, date…)
 * @param {string} options.filename  nom du fichier téléchargé
 */
export async function downloadLegalPdf({ brand, content, meta, filename }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const bottom = doc.internal.pageSize.getHeight() - 20;
  let y = margin + 4;

  function ensureSpace(height) {
    if (y + height > bottom) {
      doc.addPage();
      y = margin;
    }
  }

  function write(text, { size = 10.5, style = "normal", color = 40, indent = 0, gap = 2.5, lineHeight = 5 } = {}) {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...[].concat(color));
    const lines = doc.splitTextToSize(latin1(text), width - indent);
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      doc.text(line, margin + indent, y);
      y += lineHeight;
    });
    y += gap;
  }

  // Orange de la marque Intellino (#D9560A).
  write(brand, { size: 10, style: "bold", color: [217, 86, 10], gap: 1 });
  write(content.title, { size: 18, style: "bold", color: 20, lineHeight: 8, gap: 1 });
  write(meta, { size: 9.5, color: 110, gap: 5 });
  if (content.intro) write(content.intro);

  content.sections.forEach((section) => {
    // Un titre n'est jamais laissé seul en bas de page.
    ensureSpace(18);
    y += 2;
    write(section.title, { size: 12.5, style: "bold", color: 20, lineHeight: 6, gap: 1.5 });
    section.blocks.forEach((block) => {
      if (Array.isArray(block)) {
        block.forEach((item) => {
          ensureSpace(5);
          // Puce dessinée : « • » n'existe pas dans les polices intégrées.
          doc.setFillColor(90);
          doc.circle(margin + 2.5, y - 1.4, 0.7, "F");
          write(item, { indent: 7, gap: 0.8 });
        });
        y += 1.7;
      } else if (block && typeof block === "object") {
        ensureSpace(14);
        write(block.subtitle, { size: 11, style: "bold", color: 30, gap: 1 });
      } else {
        write(block);
      }
    });
  });

  // Pied de page : document et numérotation.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(130);
    doc.text(latin1(`${brand} — ${content.title}`), margin, bottom + 10);
    doc.text(`Page ${page} / ${pages}`, margin + width, bottom + 10, { align: "right" });
  }

  doc.save(filename);
}
