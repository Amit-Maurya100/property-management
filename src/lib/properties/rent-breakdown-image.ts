import { calcRentBreakdown, formatMoney } from "@/lib/properties/rent-calculations";

export type RentBreakdown = ReturnType<typeof calcRentBreakdown>;

type BreakdownRow = {
  label: string;
  detail?: string;
  amount: number;
};

type ImageOptions = {
  title?: string;
  subtitle?: string;
};

const SCALE = 2;
const WIDTH = 520;
const PADDING = 24;
const CONTENT_WIDTH = WIDTH - PADDING * 2;

const COLORS = {
  background: "#0f172a",
  card: "#0c1222",
  border: "#334155",
  title: "#e2e8f0",
  subtitle: "#94a3b8",
  label: "#e2e8f0",
  detail: "#64748b",
  amount: "#f1f5f9",
  divider: "#1e293b",
  totalLabel: "#6ee7b7",
  totalAmount: "#a7f3d0",
};

function breakdownRows(breakdown: RentBreakdown): BreakdownRow[] {
  return [
    { label: "Monthly rent", amount: breakdown.monthlyRent },
    {
      label: "Electricity",
      detail:
        breakdown.electricityDelta > 0
          ? `(${breakdown.electricityUnits} - ${breakdown.electricityBaseline}) units x Rs.${breakdown.electricityUnitRate}`
          : `No extra usage above ${breakdown.electricityBaseline} units`,
      amount: breakdown.electricityCharge,
    },
    {
      label: "Gas (LPG)",
      detail:
        breakdown.gasDelta > 0
          ? `(${breakdown.gasUnits} - ${breakdown.gasBaseline}) units x Rs.${breakdown.gasUnitRate}`
          : `No extra usage above ${breakdown.gasBaseline} units`,
      amount: breakdown.gasCharge,
    },
    { label: "Cleaning charges", amount: breakdown.cleaningCharge },
    { label: "Maintenance", amount: breakdown.maintenance },
    { label: "Misc", amount: breakdown.misc },
  ];
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function measureLayout(
  ctx: CanvasRenderingContext2D,
  rows: BreakdownRow[],
  options: ImageOptions,
) {
  let height = PADDING;
  height += 22;
  if (options.subtitle) {
    height += 8;
    ctx.font = "13px system-ui, -apple-system, Segoe UI, sans-serif";
    height += wrapText(ctx, options.subtitle, CONTENT_WIDTH).length * 18;
  }
  height += 16;

  const labelMaxWidth = CONTENT_WIDTH - 120;

  ctx.font = "14px system-ui, -apple-system, Segoe UI, sans-serif";
  for (const row of rows) {
    height += 22;
    if (row.detail) {
      ctx.font = "12px system-ui, -apple-system, Segoe UI, sans-serif";
      height += wrapText(ctx, row.detail, labelMaxWidth).length * 16;
      ctx.font = "14px system-ui, -apple-system, Segoe UI, sans-serif";
    }
    height += 6;
  }

  height += 12;
  height += 28;
  height += PADDING;

  return height;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function renderRentBreakdownImage(
  breakdown: RentBreakdown,
  options: ImageOptions = {},
): Promise<Blob> {
  const rows = breakdownRows(breakdown);
  const title = options.title ?? "Rent breakdown";

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) {
    return Promise.reject(new Error("Canvas is not supported"));
  }

  measureCtx.font = "16px system-ui, -apple-system, Segoe UI, sans-serif";
  const height = measureLayout(measureCtx, rows, options);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Canvas is not supported"));
  }

  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, height);

  drawRoundedRect(ctx, 12, 12, WIDTH - 24, height - 24, 14);
  ctx.fillStyle = COLORS.card;
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  let y = PADDING + 12;

  ctx.fillStyle = COLORS.title;
  ctx.font = "600 16px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(title, PADDING + 12, y);
  y += 22;

  if (options.subtitle) {
    ctx.fillStyle = COLORS.subtitle;
    ctx.font = "13px system-ui, -apple-system, Segoe UI, sans-serif";
    const subtitleLines = wrapText(ctx, options.subtitle, CONTENT_WIDTH);
    for (const line of subtitleLines) {
      ctx.fillText(line, PADDING + 12, y);
      y += 18;
    }
    y += 4;
  }

  const labelX = PADDING + 12;
  const amountX = WIDTH - PADDING - 12;
  const labelMaxWidth = CONTENT_WIDTH - 120;

  for (const row of rows) {
    y += 4;
    ctx.strokeStyle = COLORS.divider;
    ctx.beginPath();
    ctx.moveTo(labelX, y);
    ctx.lineTo(amountX, y);
    ctx.stroke();
    y += 14;

    ctx.fillStyle = COLORS.label;
    ctx.font = "14px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(row.label, labelX, y);

    ctx.fillStyle = COLORS.amount;
    ctx.font = "500 14px system-ui, -apple-system, Segoe UI, sans-serif";
    const amountText = formatMoney(row.amount);
    ctx.fillText(amountText, amountX - ctx.measureText(amountText).width, y);

    if (row.detail) {
      y += 16;
      ctx.fillStyle = COLORS.detail;
      ctx.font = "12px system-ui, -apple-system, Segoe UI, sans-serif";
      for (const line of wrapText(ctx, row.detail, labelMaxWidth)) {
        ctx.fillText(line, labelX, y);
        y += 16;
      }
    }

    y += 8;
  }

  y += 4;
  ctx.strokeStyle = "#065f46";
  ctx.beginPath();
  ctx.moveTo(labelX, y);
  ctx.lineTo(amountX, y);
  ctx.stroke();
  y += 18;

  ctx.fillStyle = COLORS.totalLabel;
  ctx.font = "600 14px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Total rent", labelX, y);

  ctx.fillStyle = COLORS.totalAmount;
  ctx.font = "600 18px system-ui, -apple-system, Segoe UI, sans-serif";
  const totalText = formatMoney(breakdown.total);
  ctx.fillText(totalText, amountX - ctx.measureText(totalText).width, y);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create image"));
    }, "image/png");
  });
}

export async function downloadRentBreakdownImage(
  breakdown: RentBreakdown,
  options: ImageOptions = {},
) {
  const blob = await renderRentBreakdownImage(breakdown, options);
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rent-breakdown-${date}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
