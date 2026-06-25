"use client";

import { FormEvent, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  saveButtonLabel,
} from "@/components/admin/ui";
import { fetchJson, fetchMutation } from "@/lib/api/client-cache";
import type { ResourceGrants } from "@/lib/permissions/grants";

export type GstMasterBankAccountRow = {
  id: string;
  gstMasterId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  branch: string;
  ifscCode: string;
};

const emptyBankForm = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  branch: "",
  ifscCode: "",
};

type GstMasterBankAccountsPanelProps = {
  gstMasterId: string;
  accounts: GstMasterBankAccountRow[];
  grants: ResourceGrants;
  disabled?: boolean;
  onChanged: () => Promise<void>;
};

export function GstMasterBankAccountsPanel({
  gstMasterId,
  accounts,
  grants,
  disabled = false,
  onChanged,
}: GstMasterBankAccountsPanelProps) {
  const [form, setForm] = useState(emptyBankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetBankForm() {
    setForm(emptyBankForm);
    setEditingId(null);
  }

  function startEdit(account: GstMasterBankAccountRow) {
    setEditingId(account.id);
    setForm({
      accountHolderName: account.accountHolderName,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      branch: account.branch,
      ifscCode: account.ifscCode,
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting || disabled) return;
    if (editingId ? !grants.canUpdate : !grants.canCreate) return;
    setError(null);
    setSubmitting(true);

    try {
      if (editingId) {
        await fetchJson(`/api/gst/masters/${gstMasterId}/bank-accounts/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetchJson(`/api/gst/masters/${gstMasterId}/bank-accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      resetBankForm();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(accountId: string) {
    if (!grants.canDelete || deletingId || disabled) return;
    if (!window.confirm("Remove this bank account?")) return;
    setError(null);
    setDeletingId(accountId);

    try {
      await fetchMutation(`/api/gst/masters/${gstMasterId}/bank-accounts/${accountId}`, {
        method: "DELETE",
      });
      if (editingId === accountId) resetBankForm();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  const canManage = editingId ? grants.canUpdate : grants.canCreate;

  return (
    <div className="mt-6 border-t border-slate-800 pt-6">
      <h3 className="text-base font-medium text-slate-200">Bank accounts</h3>
      <p className="mt-1 text-sm text-slate-400">
        Link one or more bank accounts to this GST number.
      </p>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {accounts.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950 text-left text-slate-400">
              <tr>
                <th className="px-3 py-2">A/C holder</th>
                <th className="px-3 py-2">Bank</th>
                <th className="px-3 py-2">Account #</th>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">IFSC</th>
                {(grants.canUpdate || grants.canDelete) && (
                  <th className="px-3 py-2">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t border-slate-800 text-slate-200">
                  <td className="px-3 py-2">{account.accountHolderName}</td>
                  <td className="px-3 py-2">{account.bankName}</td>
                  <td className="px-3 py-2 font-mono">{account.accountNumber}</td>
                  <td className="px-3 py-2">{account.branch}</td>
                  <td className="px-3 py-2 font-mono uppercase">{account.ifscCode}</td>
                  {(grants.canUpdate || grants.canDelete) && (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {grants.canUpdate ? (
                          <button
                            type="button"
                            className={buttonSecondaryClass}
                            disabled={disabled || submitting || deletingId !== null}
                            onClick={() => startEdit(account)}
                          >
                            Edit
                          </button>
                        ) : null}
                        {grants.canDelete ? (
                          <button
                            type="button"
                            className={buttonSecondaryClass}
                            disabled={disabled || submitting || deletingId === account.id}
                            onClick={() => void handleDelete(account.id)}
                          >
                            {deletingId === account.id ? "Removing..." : "Remove"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No bank accounts linked yet.</p>
      )}

      {canManage ? (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <fieldset disabled={disabled || submitting} className="min-w-0 border-0 p-0">
            <h4 className="text-sm font-medium text-slate-300">
              {editingId ? "Edit bank account" : "Add bank account"}
            </h4>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-300">A/C holder name</label>
                <input
                  required
                  value={form.accountHolderName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, accountHolderName: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Bank name</label>
                <input
                  required
                  value={form.bankName}
                  onChange={(e) => setForm((prev) => ({ ...prev, bankName: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Account number</label>
                <input
                  required
                  value={form.accountNumber}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, accountNumber: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Branch</label>
                <input
                  required
                  value={form.branch}
                  onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">IFSC code</label>
                <input
                  required
                  value={form.ifscCode}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      ifscCode: e.target.value.toUpperCase().replace(/\s/g, ""),
                    }))
                  }
                  className={`${inputClass} uppercase`}
                  maxLength={11}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" className={buttonPrimaryClass} disabled={submitting}>
                {saveButtonLabel({
                  submitting,
                  isEdit: !!editingId,
                  createLabel: "Link account",
                  updateLabel: "Update account",
                })}
              </button>
              {editingId ? (
                <button type="button" className={buttonSecondaryClass} onClick={resetBankForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </fieldset>
        </form>
      ) : null}
    </div>
  );
}
