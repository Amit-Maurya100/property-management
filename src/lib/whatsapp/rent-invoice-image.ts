import sharp from "sharp";
import type { RentGeneratedNotification } from "@/lib/notifications/rent-generated-payload";
import { formatMoney } from "@/lib/properties/rent-calculations";

const COMPANY_NAME = "Maurya-Homes";
const WIDTH = 720;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatDisplayDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function wrapText(value: string, maxChars: number) {
  if (value.length <= maxChars) return [value];
  const words = value.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function buildRentInvoiceSvg(data: RentGeneratedNotification) {
  const periodLabel = data.periodEnd
    ? `${formatDisplayDate(data.periodStart)} – ${formatDisplayDate(data.periodEnd)}`
    : formatDisplayDate(data.periodStart);
  const billType = data.isExitRent ? "Exit rent bill" : "Rent bill";

  const shapes: string[] = [];
  const labels: string[] = [];

  const addText = (
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    weight: "normal" | "bold" = "normal",
    anchor: "start" | "end" = "start",
  ) => {
    labels.push(
      `<text x="${x}" y="${y}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(text)}</text>`,
    );
  };

  let y = 48;
  addText(COMPANY_NAME.toUpperCase(), 32, y, 12, "#34d399", "bold");
  y = 78;
  addText(billType, 32, y, 28, "#f8fafc", "bold");
  y += 34;
  addText(periodLabel, 32, y, 16, "#94a3b8");
  y += 30;
  addText(`Dear ${data.tenantName},`, 32, y, 15, "#e2e8f0");
  y += 24;
  addText("Your rent statement is ready. See breakdown below.", 32, y, 14, "#cbd5e1");
  y += 28;

  const metaBoxTop = y;
  const metaRows = [
    ["Property", data.propertyName],
    ["Building", data.buildingName],
    ["Unit", data.unitNumber],
    ["Due date", formatDisplayDate(data.dueDate)],
  ] as const;

  for (const [label, value] of metaRows) {
    addText(label, 48, y, 13, "#94a3b8");
    addText(value, WIDTH - 48, y, 13, "#f8fafc", "normal", "end");
    y += 28;
  }

  shapes.push(
    `<rect x="32" y="${metaBoxTop - 20}" width="${WIDTH - 64}" height="${y - metaBoxTop + 28}" rx="12" fill="#020617" stroke="#1e293b" />`,
  );

  y += 16;
  const tableTop = y;
  addText("ITEM", 48, y, 12, "#94a3b8", "bold");
  addText("AMOUNT", WIDTH - 48, y, 12, "#94a3b8", "bold", "end");
  y += 24;

  for (const item of data.lineItems) {
    addText(item.label, 48, y, 14, "#e2e8f0", "bold");
    addText(formatMoney(item.amount), WIDTH - 48, y, 14, "#f8fafc", "normal", "end");
    y += 22;

    if (item.detail) {
      for (const line of wrapText(item.detail, 58)) {
        addText(line, 48, y, 11, "#94a3b8");
        y += 16;
      }
    }

    y += 8;
    shapes.push(`<line x1="48" y1="${y}" x2="${WIDTH - 48}" y2="${y}" stroke="#1e293b" />`);
    y += 16;
  }

  const summaryStart = y;
  const summaryRows: Array<[string, string, string, string]> = [
    ["Period total", formatMoney(data.periodTotal), "#cbd5e1", "#f8fafc"],
  ];
  if (data.priorBalance > 0) {
    summaryRows.push([
      "Prior balance",
      formatMoney(data.priorBalance),
      "#cbd5e1",
      "#f8fafc",
    ]);
  }
  summaryRows.push(["Amount due", formatMoney(data.amountDue), "#6ee7b7", "#ecfdf5"]);

  for (const [label, amount, labelColor, amountColor] of summaryRows) {
    const isTotal = label === "Amount due";
    addText(label, 48, y, isTotal ? 16 : 14, labelColor, "bold");
    addText(amount, WIDTH - 48, y, isTotal ? 18 : 14, amountColor, "bold", "end");
    y += isTotal ? 34 : 28;
  }

  const tableBottom = y + 12;
  shapes.push(
    `<rect x="32" y="${tableTop - 24}" width="${WIDTH - 64}" height="${tableBottom - tableTop + 24}" rx="12" fill="#0f172a" stroke="#1e293b" />`,
    `<rect x="32" y="${summaryStart - 8}" width="${WIDTH - 64}" height="${tableBottom - summaryStart + 20}" rx="12" fill="#052e1d" />`,
  );

  y = tableBottom + 24;
  addText("If you have any questions about this bill, please contact us.", 32, y, 13, "#94a3b8");
  y += 22;
  addText(COMPANY_NAME, 32, y, 13, "#64748b");

  const height = y + 32;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
    <rect width="${WIDTH}" height="${height}" fill="#020617" />
    <rect x="16" y="16" width="${WIDTH - 32}" height="${height - 32}" rx="16" fill="#0f172a" stroke="#1e293b" />
    ${shapes.join("\n")}
    ${labels.join("\n")}
  </svg>`;
}

export async function buildRentInvoiceImage(data: RentGeneratedNotification) {
  const svg = buildRentInvoiceSvg(data);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function rentInvoiceImageFilename(data: RentGeneratedNotification) {
  return `rent-${data.unitNumber}-${data.periodStart}.png`;
}
