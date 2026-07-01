import { calcRentBreakdown, formatMoney } from "@/lib/properties/rent-calculations";

const COMPANY_NAME = "Maurya-Homes";

export type RentEmailLineItem = {
  label: string;
  detail?: string;
  amount: number;
};

type RentBreakdown = ReturnType<typeof calcRentBreakdown>;

export function rentBreakdownToLineItems(breakdown: RentBreakdown): RentEmailLineItem[] {
  const baseRentLabel =
    breakdown.isProrata && breakdown.prorataDays != null
      ? `Base rent (${breakdown.prorataDays} days @ ₹${(breakdown.prorataDailyRate ?? 0).toFixed(2)}/day)`
      : "Monthly rent";

  const baseRentDetail =
    breakdown.isProrata && breakdown.fullMonthlyRent != null
      ? `Full monthly rent ₹${breakdown.fullMonthlyRent.toFixed(2)} ÷ 30 × ${breakdown.prorataDays} days`
      : undefined;

  return [
    { label: baseRentLabel, detail: baseRentDetail, amount: breakdown.monthlyRent },
    {
      label: "Electricity",
      detail:
        breakdown.electricityDelta > 0
          ? `(${breakdown.electricityUnits} − ${breakdown.electricityBaseline}) units × ₹${breakdown.electricityUnitRate}`
          : `No extra usage above ${breakdown.electricityBaseline} units`,
      amount: breakdown.electricityCharge,
    },
    {
      label: "Gas (LPG)",
      detail:
        breakdown.gasDelta > 0
          ? `(${breakdown.gasUnits} − ${breakdown.gasBaseline}) units × ₹${breakdown.gasUnitRate}`
          : `No extra usage above ${breakdown.gasBaseline} units`,
      amount: breakdown.gasCharge,
    },
    { label: "Cleaning charges", amount: breakdown.cleaningCharge },
    { label: "Maintenance", amount: breakdown.maintenance },
    { label: "Misc", amount: breakdown.misc },
  ];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDisplayDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type RentGeneratedEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export function buildRentGeneratedEmail(params: {
  tenantName: string;
  propertyName: string;
  buildingName: string;
  unitNumber: string;
  periodStart: string;
  periodEnd?: string | null;
  dueDate: string;
  lineItems: RentEmailLineItem[];
  periodTotal: number;
  priorBalance: number;
  amountDue: number;
  isExitRent: boolean;
  reminder?: boolean;
}): RentGeneratedEmailContent {
  const periodLabel = params.periodEnd
    ? `${formatDisplayDate(params.periodStart)} – ${formatDisplayDate(params.periodEnd)}`
    : formatDisplayDate(params.periodStart);

  const billType = params.isExitRent ? "Exit rent bill" : "Rent bill";
  const subject = params.reminder
    ? `Payment reminder – ${billType} – ${periodLabel} – Unit ${params.unitNumber}`
    : `${billType} – ${periodLabel} – Unit ${params.unitNumber}`;

  const lineItemsText = params.lineItems
    .map((item) => {
      const detail = item.detail ? ` (${item.detail})` : "";
      return `${item.label}${detail}: ${formatMoney(item.amount)}`;
    })
    .join("\n");

  const introLine = params.reminder
    ? `This is a friendly reminder that your ${billType.toLowerCase()} for ${periodLabel} was due on ${formatDisplayDate(params.dueDate)}. The outstanding amount is shown below.`
    : `Your ${billType.toLowerCase()} for ${periodLabel} has been generated.`;

  const text = [
    `Dear ${params.tenantName},`,
    "",
    introLine,
    "",
    `Property: ${params.propertyName}`,
    `Building: ${params.buildingName}`,
    `Unit: ${params.unitNumber}`,
    `Due date: ${formatDisplayDate(params.dueDate)}`,
    "",
    "Breakdown:",
    lineItemsText,
    "",
    `Period total: ${formatMoney(params.periodTotal)}`,
    ...(params.priorBalance > 0 ? [`Prior balance: ${formatMoney(params.priorBalance)}`] : []),
    `Amount due: ${formatMoney(params.amountDue)}`,
    "",
    `Thank you,`,
    COMPANY_NAME,
  ].join("\n");

  const lineItemsHtml = params.lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#e2e8f0;font-size:14px;">
            <div style="font-weight:500;">${escapeHtml(item.label)}</div>
            ${
              item.detail
                ? `<div style="font-size:12px;color:#94a3b8;margin-top:2px;">${escapeHtml(item.detail)}</div>`
                : ""
            }
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#f8fafc;font-size:14px;text-align:right;white-space:nowrap;">
            ${escapeHtml(formatMoney(item.amount))}
          </td>
        </tr>`,
    )
    .join("");

  const priorBalanceRow =
    params.priorBalance > 0
      ? `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#e2e8f0;font-size:14px;">Prior balance</td>
          <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#f8fafc;font-size:14px;text-align:right;">${escapeHtml(formatMoney(params.priorBalance))}</td>
        </tr>`
      : "";

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;color:#e2e8f0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 24px 12px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#34d399;">${escapeHtml(COMPANY_NAME)}</p>
                <h1 style="margin:0;font-size:24px;color:#f8fafc;">${escapeHtml(params.reminder ? "Payment reminder" : billType)}</h1>
                <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;">${escapeHtml(periodLabel)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 16px;">
                <p style="margin:0 0 12px;font-size:15px;color:#e2e8f0;">Dear ${escapeHtml(params.tenantName)},</p>
                <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.6;">
                  ${
                    params.reminder
                      ? `This is a friendly reminder that your rent payment was due on ${escapeHtml(formatDisplayDate(params.dueDate))}. Please find the breakdown and outstanding amount below.`
                      : "Your rent statement for the period below is ready. Please find the breakdown and total amount due."
                  }
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020617;border:1px solid #1e293b;border-radius:12px;">
                  <tr>
                    <td style="padding:12px 16px;font-size:13px;color:#94a3b8;">Property</td>
                    <td style="padding:12px 16px;font-size:13px;color:#f8fafc;text-align:right;">${escapeHtml(params.propertyName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;font-size:13px;color:#94a3b8;border-top:1px solid #1e293b;">Building</td>
                    <td style="padding:12px 16px;font-size:13px;color:#f8fafc;text-align:right;border-top:1px solid #1e293b;">${escapeHtml(params.buildingName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;font-size:13px;color:#94a3b8;border-top:1px solid #1e293b;">Unit</td>
                    <td style="padding:12px 16px;font-size:13px;color:#f8fafc;text-align:right;border-top:1px solid #1e293b;">${escapeHtml(params.unitNumber)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;font-size:13px;color:#94a3b8;border-top:1px solid #1e293b;">Due date</td>
                    <td style="padding:12px 16px;font-size:13px;color:#f8fafc;text-align:right;border-top:1px solid #1e293b;">${escapeHtml(formatDisplayDate(params.dueDate))}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #1e293b;border-radius:12px;overflow:hidden;">
                  <thead>
                    <tr style="background:#020617;">
                      <th align="left" style="padding:12px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Item</th>
                      <th align="right" style="padding:12px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${lineItemsHtml}
                    <tr>
                      <td style="padding:12px;color:#cbd5e1;font-size:14px;font-weight:600;">Period total</td>
                      <td style="padding:12px;color:#f8fafc;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(formatMoney(params.periodTotal))}</td>
                    </tr>
                    ${priorBalanceRow}
                    <tr style="background:#052e1d;">
                      <td style="padding:14px 12px;color:#6ee7b7;font-size:15px;font-weight:700;">Amount due</td>
                      <td style="padding:14px 12px;color:#ecfdf5;font-size:16px;font-weight:700;text-align:right;">${escapeHtml(formatMoney(params.amountDue))}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 24px;">
                <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                  If you have any questions about this bill, please contact us.
                </p>
                <p style="margin:12px 0 0;font-size:13px;color:#64748b;">${escapeHtml(COMPANY_NAME)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
