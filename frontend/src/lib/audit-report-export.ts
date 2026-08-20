export interface AuditReportExport {
  id: number;
  titre: string;
  periodeDebut: string;
  periodeFin: string;
  createdAt: string;
  courriersTraites: number;
  delaiMoyen: string;
  anomalies: number;
  resume?: Record<string, unknown> | null;
  genereParNom?: string;
}

const RESUME_LABELS: Record<string, string> = {
  courriersTraites: "Courriers traités",
  archives: "Archivés",
  envoyes: "Envoyés",
  recus: "Reçus",
  enTraitement: "En traitement",
  actionsFlux: "Actions de flux",
  evenementsAudit: "Événements d'audit",
  delaiMoyenH: "Délai moyen (heures)",
  anomalies: "Anomalies ouvertes",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slug(titre: string, id: number) {
  const base = titre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `rapport-audit-${id}-${base || "fluxmin"}`;
}

function buildRows(rapport: AuditReportExport): string[][] {
  const rows: string[][] = [
    ["Champ", "Valeur"],
    ["Titre", rapport.titre],
    ["Période début", formatDate(rapport.periodeDebut)],
    ["Période fin", formatDate(rapport.periodeFin)],
    ["Généré le", formatDate(rapport.createdAt)],
    ["Généré par", rapport.genereParNom || "—"],
    ["Courriers traités", String(rapport.courriersTraites)],
    ["Délai moyen", rapport.delaiMoyen],
    ["Anomalies", String(rapport.anomalies)],
  ];

  if (rapport.resume) {
    for (const [k, v] of Object.entries(rapport.resume)) {
      rows.push([RESUME_LABELS[k] || k, String(v)]);
    }
  }

  return rows;
}

export function downloadAuditReportJson(rapport: AuditReportExport) {
  const blob = new Blob([JSON.stringify(rapport, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, `${slug(rapport.titre, rapport.id)}.json`);
}

export function downloadAuditReportCsv(rapport: AuditReportExport) {
  const csv = buildRows(rapport)
    .map((r) =>
      r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(blob, `${slug(rapport.titre, rapport.id)}.csv`);
}

export async function downloadAuditReportXlsx(rapport: AuditReportExport) {
  const XLSX = await import("xlsx");
  const rows = buildRows(rapport);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 28 }, { wch: 40 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Rapport");

  const resume = rapport.resume || {};
  const kpiRows: (string | number)[][] = [
    ["Indicateur", "Valeur"],
    ["Courriers traités", rapport.courriersTraites],
    ["Délai moyen", rapport.delaiMoyen],
    ["Anomalies", rapport.anomalies],
    ...Object.entries(resume).map(([k, v]) => [
      RESUME_LABELS[k] || k,
      v as string | number,
    ]),
  ];
  const kpiSheet = XLSX.utils.aoa_to_sheet(kpiRows);
  kpiSheet["!cols"] = [{ wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, kpiSheet, "Indicateurs");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `${slug(rapport.titre, rapport.id)}.xlsx`);
}

export async function downloadAuditReportPdf(rapport: AuditReportExport) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 22;

  const line = (text: string, size = 11, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.45) + 2;
  };

  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("FluxMin — Rapport d'audit", margin, 9);

  doc.setTextColor(30, 30, 30);
  y = 28;
  line(rapport.titre, 16, "bold");
  y += 2;
  line(`Période : ${formatDate(rapport.periodeDebut)} — ${formatDate(rapport.periodeFin)}`, 10);
  line(`Généré le ${formatDate(rapport.createdAt)}${rapport.genereParNom ? ` par ${rapport.genereParNom}` : ""}`, 10);
  y += 4;

  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 2, 2, "FD");
  const boxY = y + 8;
  const colW = (pageW - margin * 2) / 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(String(rapport.courriersTraites), margin + 6, boxY);
  doc.text(String(rapport.delaiMoyen), margin + colW + 6, boxY);
  doc.text(String(rapport.anomalies), margin + colW * 2 + 6, boxY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Courriers traités", margin + 6, boxY + 7);
  doc.text("Délai moyen", margin + colW + 6, boxY + 7);
  doc.text("Anomalies", margin + colW * 2 + 6, boxY + 7);

  doc.setTextColor(30, 30, 30);
  y += 36;
  line("Indicateurs détaillés", 12, "bold");
  y += 2;

  const resume = rapport.resume || {
    courriersTraites: rapport.courriersTraites,
    delaiMoyenH: rapport.delaiMoyen,
    anomalies: rapport.anomalies,
  };

  for (const [k, v] of Object.entries(resume)) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(RESUME_LABELS[k] || k, margin, y);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(String(v), pageW - margin, y, { align: "right" });
    y += 8;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y - 4, pageW - margin, y - 4);
  }

  y += 10;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(
    "Document généré automatiquement par FluxMin. Usage interne — lecture audit.",
    margin,
    y
  );

  doc.save(`${slug(rapport.titre, rapport.id)}.pdf`);
}
