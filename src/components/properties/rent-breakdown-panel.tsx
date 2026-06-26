"use client";

import { useState } from "react";
import { buttonSecondaryClass } from "@/components/admin/ui";
import { calcRentBreakdown, formatMoney } from "@/lib/properties/rent-calculations";
import { downloadRentBreakdownImage } from "@/lib/properties/rent-breakdown-image";

type RentBreakdown = ReturnType<typeof calcRentBreakdown>;

function LineItem({
  label,
  detail,
  amount,
}: {
  label: string;
  detail?: string;
  amount: number;
}) {
  return (
    <tr className="border-b border-slate-800 last:border-b-0">
      <td className="py-1 pr-3 align-top">
        <p className="text-sm text-slate-200">{label}</p>
        {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
      </td>
      <td className="w-px py-1 pl-3 align-top text-right text-sm font-medium tabular-nums text-slate-100 whitespace-nowrap">
        {formatMoney(amount)}
      </td>
    </tr>
  );
}

export function RentBreakdownPanel({
  breakdown,
  subtitle,
}: {
  breakdown: RentBreakdown;
  subtitle?: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadImage() {
    setDownloading(true);
    try {
      await downloadRentBreakdownImage(breakdown, { subtitle });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="md:col-span-2 flex w-fit max-w-full flex-col gap-2">
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-200">Rent breakdown</h3>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        <table className="mt-2 w-full text-sm">
          <tbody>
            <LineItem
          label={
            breakdown.isProrata && breakdown.prorataDays != null
              ? `Base rent (${breakdown.prorataDays} days @ ₹${(breakdown.prorataDailyRate ?? 0).toFixed(2)}/day)`
              : "Monthly rent"
          }
          detail={
            breakdown.isProrata && breakdown.fullMonthlyRent != null
              ? `Full monthly rent ₹${breakdown.fullMonthlyRent.toFixed(2)} ÷ 30 × ${breakdown.prorataDays} days`
              : undefined
          }
          amount={breakdown.monthlyRent}
        />
            <LineItem
              label="Electricity"
              detail={
                breakdown.electricityDelta > 0
                  ? `(${breakdown.electricityUnits} − ${breakdown.electricityBaseline}) units × ₹${breakdown.electricityUnitRate}`
                  : `No extra usage above ${breakdown.electricityBaseline} units`
              }
              amount={breakdown.electricityCharge}
            />
            <LineItem
              label="Gas (LPG)"
              detail={
                breakdown.gasDelta > 0
                  ? `(${breakdown.gasUnits} − ${breakdown.gasBaseline}) units × ₹${breakdown.gasUnitRate}`
                  : `No extra usage above ${breakdown.gasBaseline} units`
              }
              amount={breakdown.gasCharge}
            />
            <LineItem label="Cleaning charges" amount={breakdown.cleaningCharge} />
            <LineItem label="Maintenance" amount={breakdown.maintenance} />
            <LineItem label="Misc" amount={breakdown.misc} />
          </tbody>
          <tfoot>
            <tr className="border-t border-emerald-500/30">
              <td className="pt-2 pr-3 text-sm font-semibold text-emerald-200">Total rent</td>
              <td className="w-px pt-2 pl-3 text-right text-base font-semibold tabular-nums text-emerald-100">
                {formatMoney(breakdown.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button
        type="button"
        className={`${buttonSecondaryClass} self-start`}
        disabled={downloading}
        onClick={() => void handleDownloadImage()}
      >
        {downloading ? "Preparing image..." : "Download image"}
      </button>
    </div>
  );
}
