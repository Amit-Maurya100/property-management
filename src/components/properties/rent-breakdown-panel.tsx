import {
  ELECTRICITY_UNIT_RATE,
  GAS_UNIT_RATE,
  calcRentBreakdown,
  formatMoney,
} from "@/lib/properties/rent-calculations";

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
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 py-2 last:border-b-0">
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
      </div>
      <p className="shrink-0 text-sm font-medium text-slate-100">{formatMoney(amount)}</p>
    </div>
  );
}

export function RentBreakdownPanel({ breakdown }: { breakdown: RentBreakdown }) {
  return (
    <div className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
      <h3 className="text-sm font-medium text-slate-200">Rent breakdown</h3>
      <div className="mt-3">
        <LineItem label="Monthly rent" amount={breakdown.monthlyRent} />
        <LineItem
          label="Electricity"
          detail={
            breakdown.electricityDelta > 0
              ? `(${breakdown.electricityUnits} − ${breakdown.electricityBaseline}) units × ₹${ELECTRICITY_UNIT_RATE}`
              : `No extra usage above ${breakdown.electricityBaseline} units`
          }
          amount={breakdown.electricityCharge}
        />
        <LineItem
          label="Gas"
          detail={
            breakdown.gasDelta > 0
              ? `(${breakdown.gasUnits} − ${breakdown.gasBaseline}) units × ₹${GAS_UNIT_RATE}`
              : `No extra usage above ${breakdown.gasBaseline} units`
          }
          amount={breakdown.gasCharge}
        />
        <LineItem label="Maintenance" amount={breakdown.maintenance} />
        <LineItem label="Misc" amount={breakdown.misc} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-emerald-500/30 pt-3">
        <p className="text-sm font-semibold text-emerald-200">Total rent</p>
        <p className="text-lg font-semibold text-emerald-100">{formatMoney(breakdown.total)}</p>
      </div>
    </div>
  );
}
