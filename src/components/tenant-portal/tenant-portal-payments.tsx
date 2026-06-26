"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/client-cache";
import { formatMoney } from "@/lib/properties/rent-calculations";

type PortalPayment = {
  id: string;
  amount: string | number;
  mode: string;
  accountName: string | null;
  appliedToRent: string | number;
  toAdvance: string | number;
  paidAt: string;
  notes: string | null;
  rent: {
    startDate: string;
    endDate: string | null;
    unit: { unitNumber: string };
  };
};

export function TenantPortalPayments() {
  const [payments, setPayments] = useState<PortalPayment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<PortalPayment[]>("/api/portal/payments")
      .then(setPayments)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load payments"));
  }, []);

  if (error) {
    return <p className="text-red-300">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">My Payments</h1>
        <p className="mt-1 text-sm text-slate-400">All payments recorded against your rent</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-800 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Paid on</th>
              <th className="px-4 py-3">Rent period</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Applied to rent</th>
              <th className="px-4 py-3">Mode</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-800 last:border-b-0">
                  <td className="px-4 py-3 text-white">{payment.paidAt.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {payment.rent.startDate.slice(0, 10)}
                    {payment.rent.endDate ? ` – ${payment.rent.endDate.slice(0, 10)}` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{payment.rent.unit.unitNumber}</td>
                  <td className="px-4 py-3 text-white">{formatMoney(Number(payment.amount))}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatMoney(Number(payment.appliedToRent))}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{payment.mode}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
