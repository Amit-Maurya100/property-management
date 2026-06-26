"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  saveButtonLabel,
} from "@/components/admin/ui";
import { RowActions } from "@/components/admin/row-actions";
import { BarcodeImage } from "@/components/shared/barcode-image";
import { fetchJson, fetchMutation } from "@/lib/api/client-cache";
import type { ResourceGrants } from "@/lib/permissions/grants";

export type RentPaymentAccountRow = {
  id: string;
  label: string;
  accountType: "BANK" | "UPI";
  accountHolderName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  branch: string | null;
  ifscCode: string | null;
  upiId: string | null;
  upiBarcodeUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

const emptyBankForm = {
  label: "",
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  branch: "",
  ifscCode: "",
  sortOrder: "0",
};

const emptyUpiForm = {
  label: "",
  upiId: "",
  upiBarcodeUrl: "",
  sortOrder: "0",
};

type RentPaymentAccountsAdminProps = {
  grants: ResourceGrants;
};

export function RentPaymentAccountsAdmin({ grants }: RentPaymentAccountsAdminProps) {
  const [accounts, setAccounts] = useState<RentPaymentAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"BANK" | "UPI">("BANK");
  const [bankForm, setBankForm] = useState(emptyBankForm);
  const [upiForm, setUpiForm] = useState(emptyUpiForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchJson<RentPaymentAccountRow[]>("/api/rent-payment-accounts");
      setAccounts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  function resetForms() {
    setBankForm(emptyBankForm);
    setUpiForm(emptyUpiForm);
    setEditingId(null);
  }

  function startEdit(account: RentPaymentAccountRow) {
    setEditingId(account.id);
    setAccountType(account.accountType);
    if (account.accountType === "BANK") {
      setBankForm({
        label: account.label,
        accountHolderName: account.accountHolderName ?? "",
        bankName: account.bankName ?? "",
        accountNumber: account.accountNumber ?? "",
        branch: account.branch ?? "",
        ifscCode: account.ifscCode ?? "",
        sortOrder: String(account.sortOrder),
      });
    } else {
      setUpiForm({
        label: account.label,
        upiId: account.upiId ?? "",
        upiBarcodeUrl: account.upiBarcodeUrl ?? "",
        sortOrder: String(account.sortOrder),
      });
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (editingId ? !grants.canUpdate : !grants.canCreate) return;
    setError(null);
    setSubmitting(true);

    try {
      if (editingId) {
        const payload =
          accountType === "BANK"
            ? {
                label: bankForm.label,
                accountHolderName: bankForm.accountHolderName,
                bankName: bankForm.bankName,
                accountNumber: bankForm.accountNumber,
                branch: bankForm.branch,
                ifscCode: bankForm.ifscCode,
                sortOrder: Number(bankForm.sortOrder) || 0,
              }
            : {
                label: upiForm.label,
                upiId: upiForm.upiId,
                upiBarcodeUrl: upiForm.upiBarcodeUrl || null,
                sortOrder: Number(upiForm.sortOrder) || 0,
              };
        await fetchJson(`/api/rent-payment-accounts/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else if (accountType === "BANK") {
        await fetchJson("/api/rent-payment-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountType: "BANK",
            label: bankForm.label,
            accountHolderName: bankForm.accountHolderName,
            bankName: bankForm.bankName,
            accountNumber: bankForm.accountNumber,
            branch: bankForm.branch,
            ifscCode: bankForm.ifscCode,
            sortOrder: Number(bankForm.sortOrder) || 0,
          }),
        });
      } else {
        await fetchJson("/api/rent-payment-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountType: "UPI",
            label: upiForm.label,
            upiId: upiForm.upiId,
            upiBarcodeUrl: upiForm.upiBarcodeUrl || null,
            sortOrder: Number(upiForm.sortOrder) || 0,
          }),
        });
      }
      resetForms();
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(accountId: string) {
    if (!grants.canDelete || deletingId) return;
    if (!window.confirm("Remove this payment account? Tenants assigned to it will lose access.")) {
      return;
    }
    setError(null);
    setDeletingId(accountId);
    try {
      await fetchMutation(`/api/rent-payment-accounts/${accountId}`, { method: "DELETE" });
      if (editingId === accountId) resetForms();
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleActive(account: RentPaymentAccountRow) {
    if (!grants.canUpdate) return;
    setError(null);
    try {
      await fetchJson(`/api/rent-payment-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  const canManageForm = editingId ? grants.canUpdate : grants.canCreate;
  const bankAccounts = accounts.filter((row) => row.accountType === "BANK");
  const upiAccounts = accounts.filter((row) => row.accountType === "UPI");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payment Accounts</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure bank accounts and UPI IDs for rent collection. Assign them to tenants from the
          Tenants page.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-slate-400">Loading payment accounts...</p>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-medium text-white">Bank accounts</h2>
            <AccountTable
              accounts={bankAccounts}
              grants={grants}
              deletingId={deletingId}
              submitting={submitting}
              onEdit={startEdit}
              onDelete={handleDelete}
              onToggleActive={toggleActive}
            />
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-medium text-white">UPI accounts</h2>
            <UpiAccountTable
              accounts={upiAccounts}
              grants={grants}
              deletingId={deletingId}
              submitting={submitting}
              onEdit={startEdit}
              onDelete={handleDelete}
              onToggleActive={toggleActive}
            />
          </section>
        </>
      )}

      {canManageForm ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={accountType === "BANK" ? buttonPrimaryClass : buttonSecondaryClass}
              onClick={() => {
                if (!editingId) setAccountType("BANK");
              }}
              disabled={!!editingId}
            >
              Bank account
            </button>
            <button
              type="button"
              className={accountType === "UPI" ? buttonPrimaryClass : buttonSecondaryClass}
              onClick={() => {
                if (!editingId) setAccountType("UPI");
              }}
              disabled={!!editingId}
            >
              UPI
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <fieldset disabled={submitting} className="min-w-0 border-0 p-0">
              <h3 className="text-base font-medium text-slate-200">
                {editingId ? "Edit" : "Add"}{" "}
                {accountType === "BANK" ? "bank account" : "UPI account"}
              </h3>

              {accountType === "BANK" ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Label" required>
                    <input
                      className={inputClass}
                      value={bankForm.label}
                      onChange={(e) => setBankForm((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g. HDFC Primary"
                      required
                    />
                  </Field>
                  <Field label="Sort order">
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      value={bankForm.sortOrder}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Account holder" required>
                    <input
                      className={inputClass}
                      value={bankForm.accountHolderName}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, accountHolderName: e.target.value }))
                      }
                      required
                    />
                  </Field>
                  <Field label="Bank name" required>
                    <input
                      className={inputClass}
                      value={bankForm.bankName}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, bankName: e.target.value }))
                      }
                      required
                    />
                  </Field>
                  <Field label="Account number" required>
                    <input
                      className={inputClass}
                      value={bankForm.accountNumber}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, accountNumber: e.target.value }))
                      }
                      required
                    />
                  </Field>
                  <Field label="Branch" required>
                    <input
                      className={inputClass}
                      value={bankForm.branch}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, branch: e.target.value }))
                      }
                      required
                    />
                  </Field>
                  <Field label="IFSC" required>
                    <input
                      className={`${inputClass} uppercase`}
                      value={bankForm.ifscCode}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, ifscCode: e.target.value }))
                      }
                      required
                    />
                  </Field>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Label" required>
                    <input
                      className={inputClass}
                      value={upiForm.label}
                      onChange={(e) => setUpiForm((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g. PhonePe"
                      required
                    />
                  </Field>
                  <Field label="Sort order">
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      value={upiForm.sortOrder}
                      onChange={(e) =>
                        setUpiForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="UPI ID" required>
                    <input
                      className={inputClass}
                      value={upiForm.upiId}
                      onChange={(e) => setUpiForm((prev) => ({ ...prev, upiId: e.target.value }))}
                      placeholder="name@bank"
                      required
                    />
                  </Field>
                  <Field label="UPI barcode image URL">
                    <input
                      className={inputClass}
                      value={upiForm.upiBarcodeUrl}
                      onChange={(e) =>
                        setUpiForm((prev) => ({ ...prev, upiBarcodeUrl: e.target.value }))
                      }
                      placeholder="Google Drive share link or direct image URL"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Google Drive links are supported — set sharing to{" "}
                      <span className="text-slate-400">Anyone with the link</span>.
                    </p>
                  </Field>
                  {upiForm.upiBarcodeUrl ? (
                    <div className="md:col-span-2">
                      <BarcodeImage
                        src={upiForm.upiBarcodeUrl}
                        alt="UPI barcode preview"
                        className="max-h-48 rounded-lg border border-slate-700 bg-white p-2"
                      />
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button type="submit" className={buttonPrimaryClass} disabled={submitting}>
                  {saveButtonLabel({
                    submitting,
                    isEdit: !!editingId,
                    createLabel: "Add account",
                    updateLabel: "Save changes",
                  })}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    className={buttonSecondaryClass}
                    onClick={resetForms}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </fieldset>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-300">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}

function AccountTable({
  accounts,
  grants,
  deletingId,
  submitting,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  accounts: RentPaymentAccountRow[];
  grants: ResourceGrants;
  deletingId: string | null;
  submitting: boolean;
  onEdit: (account: RentPaymentAccountRow) => void;
  onDelete: (id: string) => void;
  onToggleActive: (account: RentPaymentAccountRow) => void;
}) {
  if (accounts.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No bank accounts configured yet.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-950 text-left text-slate-400">
          <tr>
            <th className="px-3 py-2">Label</th>
            <th className="px-3 py-2">Holder</th>
            <th className="px-3 py-2">Bank</th>
            <th className="px-3 py-2">Account #</th>
            <th className="px-3 py-2">IFSC</th>
            <th className="px-3 py-2">Active</th>
            {(grants.canUpdate || grants.canDelete) && <th className="px-3 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-t border-slate-800 text-slate-200">
              <td className="px-3 py-2">{account.label}</td>
              <td className="px-3 py-2">{account.accountHolderName}</td>
              <td className="px-3 py-2">{account.bankName}</td>
              <td className="px-3 py-2 font-mono">{account.accountNumber}</td>
              <td className="px-3 py-2 font-mono uppercase">{account.ifscCode}</td>
              <td className="px-3 py-2">
                {grants.canUpdate ? (
                  <button
                    type="button"
                    className="text-sky-400 hover:underline"
                    onClick={() => void onToggleActive(account)}
                  >
                    {account.isActive ? "Yes" : "No"}
                  </button>
                ) : (
                  (account.isActive ? "Yes" : "No")
                )}
              </td>
              {(grants.canUpdate || grants.canDelete) && (
                <td className="px-3 py-2">
                  <RowActions
                    canUpdate={grants.canUpdate}
                    canDelete={grants.canDelete}
                    onEdit={() => onEdit(account)}
                    onDelete={() => void onDelete(account.id)}
                    deleting={deletingId === account.id}
                    disabled={submitting}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UpiAccountTable({
  accounts,
  grants,
  deletingId,
  submitting,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  accounts: RentPaymentAccountRow[];
  grants: ResourceGrants;
  deletingId: string | null;
  submitting: boolean;
  onEdit: (account: RentPaymentAccountRow) => void;
  onDelete: (id: string) => void;
  onToggleActive: (account: RentPaymentAccountRow) => void;
}) {
  if (accounts.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No UPI accounts configured yet.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-950 text-left text-slate-400">
          <tr>
            <th className="px-3 py-2">Label</th>
            <th className="px-3 py-2">UPI ID</th>
            <th className="px-3 py-2">Barcode</th>
            <th className="px-3 py-2">Active</th>
            {(grants.canUpdate || grants.canDelete) && <th className="px-3 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-t border-slate-800 text-slate-200">
              <td className="px-3 py-2">{account.label}</td>
              <td className="px-3 py-2 font-mono">{account.upiId}</td>
              <td className="px-3 py-2">
                {account.upiBarcodeUrl ? (
                  <BarcodeImage
                    src={account.upiBarcodeUrl}
                    alt={`${account.label} UPI barcode`}
                    className="h-16 w-16 rounded border border-slate-700 bg-white object-contain p-1"
                  />
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2">
                {grants.canUpdate ? (
                  <button
                    type="button"
                    className="text-sky-400 hover:underline"
                    onClick={() => void onToggleActive(account)}
                  >
                    {account.isActive ? "Yes" : "No"}
                  </button>
                ) : (
                  (account.isActive ? "Yes" : "No")
                )}
              </td>
              {(grants.canUpdate || grants.canDelete) && (
                <td className="px-3 py-2">
                  <RowActions
                    canUpdate={grants.canUpdate}
                    canDelete={grants.canDelete}
                    onEdit={() => onEdit(account)}
                    onDelete={() => void onDelete(account.id)}
                    deleting={deletingId === account.id}
                    disabled={submitting}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
