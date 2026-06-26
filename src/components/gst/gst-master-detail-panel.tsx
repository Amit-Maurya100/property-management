"use client";

import type { ReactNode } from "react";
import { buttonPrimaryClass, buttonSecondaryClass } from "@/components/admin/ui";
import type { GstMasterBankAccountRow } from "@/components/gst/gst-master-bank-accounts-panel";
import type { ResourceGrants } from "@/lib/permissions/grants";

export type GstMasterDetailRow = {
  id: string;
  gstNumber: string;
  legalName: string;
  tradeName: string;
  effectiveRegistrationDate: string;
  constitutionOfBusiness: string;
  gstinStatus: string;
  taxpayerType: string;
  principalPlaceOfBusiness: string;
  primaryContact?: string | null;
  secondaryContact?: string | null;
  bankAccounts: GstMasterBankAccountRow[];
};

function formatDate(value: string) {
  return value.slice(0, 10);
}

function displayValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function ViewField({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

type GstMasterDetailPanelProps = {
  row: GstMasterDetailRow;
  grants: ResourceGrants;
  onClose: () => void;
  onEdit?: () => void;
  embedded?: boolean;
};

export function GstMasterDetailPanel({
  row,
  grants,
  onClose,
  onEdit,
  embedded = false,
}: GstMasterDetailPanelProps) {
  return (
    <div
      className={
        embedded
          ? "rounded-xl border border-slate-800 bg-slate-900 p-4"
          : "mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-slate-100">GST master details</h2>
          <p className="mt-1 font-mono text-sm text-sky-300">{row.gstNumber}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {grants.canUpdate && onEdit ? (
            <button type="button" className={buttonPrimaryClass} onClick={onEdit}>
              Edit
            </button>
          ) : null}
          <button type="button" className={buttonSecondaryClass} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 md:grid-cols-2">
        <ViewField label="GST number" value={row.gstNumber} mono />
        <ViewField label="Trade name" value={displayValue(row.tradeName)} />
        <ViewField label="Legal name" value={row.legalName} />
        <ViewField
          label="Effective date of registration"
          value={formatDate(row.effectiveRegistrationDate)}
        />
        <ViewField label="Primary contact" value={displayValue(row.primaryContact)} />
        <ViewField label="Secondary contact" value={displayValue(row.secondaryContact)} />
        <ViewField label="Constitution of business" value={row.constitutionOfBusiness} />
        <ViewField label="GSTIN / UIN status" value={row.gstinStatus} />
        <ViewField label="Taxpayer type" value={row.taxpayerType} />
        <ViewField
          label="Principal place of business"
          value={row.principalPlaceOfBusiness}
          wide
        />
      </dl>

      <div className="mt-6 border-t border-slate-800 pt-6">
        <h3 className="text-sm font-medium text-slate-300">Bank accounts</h3>
        {row.bankAccounts.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950 text-left text-slate-400">
                <tr>
                  <th className="px-3 py-2">A/C holder</th>
                  <th className="px-3 py-2">Bank</th>
                  <th className="px-3 py-2">Account #</th>
                  <th className="px-3 py-2">Branch</th>
                  <th className="px-3 py-2">IFSC</th>
                </tr>
              </thead>
              <tbody>
                {row.bankAccounts.map((account) => (
                  <tr key={account.id} className="border-t border-slate-800 text-slate-200">
                    <td className="px-3 py-2">{account.accountHolderName}</td>
                    <td className="px-3 py-2">{account.bankName}</td>
                    <td className="px-3 py-2 font-mono">{account.accountNumber}</td>
                    <td className="px-3 py-2">{account.branch}</td>
                    <td className="px-3 py-2 font-mono uppercase">{account.ifscCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No bank accounts linked.</p>
        )}
      </div>
    </div>
  );
}

const linkClass =
  "text-left text-sky-400 hover:text-sky-300 hover:underline focus:outline-none focus-visible:underline";

export function GstMasterViewLink({
  children,
  onClick,
  mono = false,
}: {
  children: ReactNode;
  onClick: () => void;
  mono?: boolean;
}) {
  return (
    <button type="button" className={`${linkClass} ${mono ? "font-mono" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}
