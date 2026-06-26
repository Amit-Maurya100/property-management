import { RentBreakdownPanel } from "@/components/properties/rent-breakdown-panel";
import { formatMoney } from "@/lib/properties/payment-calculations";
import type { calcRentBreakdown } from "@/lib/properties/rent-calculations";

type RentBreakdown = ReturnType<typeof calcRentBreakdown>;

function SummaryLine({
  label,
  amount,
  detail,
  emphasis,
  muted,
}: {
  label: string;
  amount: number;
  detail?: string;
  emphasis?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 border-b border-slate-800 py-2 last:border-b-0 ${
        emphasis ? "border-t border-slate-700 pt-3" : ""
      }`}
    >
      <div>
        <p
          className={`text-sm ${emphasis ? "font-semibold text-emerald-200" : muted ? "text-slate-400" : "text-slate-200"}`}
        >
          {label}
        </p>
        {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
      </div>
      <p
        className={`shrink-0 text-sm ${emphasis ? "text-lg font-semibold text-emerald-100" : muted ? "text-slate-400" : "font-medium text-slate-100"}`}
      >
        {formatMoney(amount)}
      </p>
    </div>
  );
}

export function PaymentBreakdownPanel({
  rentBreakdown,
  rentBreakdownSubtitle,
  priorBalance,
  advanceBalance,
  paidTotal,
  amountDue,
  balanceDue,
}: {
  rentBreakdown: RentBreakdown | null;
  rentBreakdownSubtitle?: string;
  priorBalance: number;
  advanceBalance: number;
  paidTotal: number;
  amountDue: number;
  balanceDue: number;
}) {
  return (
    <div className="mt-4 space-y-4">
      {rentBreakdown ? (
        <RentBreakdownPanel breakdown={rentBreakdown} subtitle={rentBreakdownSubtitle} />
      ) : (
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
          Rent line-item breakdown is not available for this bill.
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-200">Payment summary</h3>
        <div className="mt-3">
          {priorBalance > 0 ? (
            <SummaryLine
              label="Balance from previous months"
              detail="Unpaid amount carried forward from earlier rent bills"
              amount={priorBalance}
            />
          ) : null}
          <SummaryLine label="Total amount due" amount={amountDue} emphasis />
          {advanceBalance > 0 ? (
            <SummaryLine
              label="Tenant advance available"
              detail="Existing advance balance (overpayments from earlier payments)"
              amount={advanceBalance}
              muted
            />
          ) : null}
          {paidTotal > 0 ? (
            <SummaryLine label="Already paid" amount={paidTotal} muted />
          ) : null}
          <SummaryLine label="Balance remaining" amount={balanceDue} emphasis />
        </div>
      </div>
    </div>
  );
}
