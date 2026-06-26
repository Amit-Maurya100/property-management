"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonPrimaryClass, buttonSecondaryClass } from "@/components/admin/ui";
import { fetchJson } from "@/lib/api/client-cache";
import type { RentPaymentAccountRow } from "@/components/properties/rent-payment-accounts-admin";

type AssignmentResponse = {
  available: RentPaymentAccountRow[];
  assigned: RentPaymentAccountRow[];
  assignedIds: string[];
};

type TenantPaymentAccountsPanelProps = {
  tenantId: string;
  canUpdate: boolean;
};

export function TenantPaymentAccountsPanel({ tenantId, canUpdate }: TenantPaymentAccountsPanelProps) {
  const [available, setAvailable] = useState<RentPaymentAccountRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<AssignmentResponse>(`/api/tenants/${tenantId}/payment-accounts`);
      setAvailable(data.available);
      setSelectedIds(data.assignedIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment accounts");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleAccount(accountId: string) {
    setSaved(false);
    setSelectedIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId],
    );
  }

  async function handleSave() {
    if (!canUpdate || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const data = await fetchJson<AssignmentResponse>(`/api/tenants/${tenantId}/payment-accounts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds: selectedIds }),
      });
      setAvailable(data.available);
      setSelectedIds(data.assignedIds);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 border-t border-slate-800 pt-6">
      <h3 className="text-base font-medium text-slate-200">Payment methods for tenant</h3>
      <p className="mt-1 text-sm text-slate-400">
        Select which bank accounts and UPI IDs this tenant can use to pay rent. Configure accounts
        under Rent → Payment Accounts.
      </p>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {saved ? (
        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Payment methods updated.
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading...</p>
      ) : available.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No payment accounts configured yet. Add bank or UPI accounts from the Payment Accounts
          page first.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {available.map((account) => (
            <label
              key={account.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800"
                checked={selectedIds.includes(account.id)}
                onChange={() => toggleAccount(account.id)}
                disabled={!canUpdate || saving}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-200">{account.label}</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    {account.accountType === "BANK" ? "Bank" : "UPI"}
                  </span>
                </div>
                {account.accountType === "BANK" ? (
                  <p className="mt-1 text-sm text-slate-400">
                    {account.accountHolderName} · {account.bankName} · {account.accountNumber} ·{" "}
                    {account.ifscCode}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-mono text-slate-400">{account.upiId}</p>
                )}
              </div>
            </label>
          ))}

          {canUpdate ? (
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className={buttonPrimaryClass}
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save payment methods"}
              </button>
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => void load()}
                disabled={saving}
              >
                Reset
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
