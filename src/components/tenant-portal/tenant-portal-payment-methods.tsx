"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/client-cache";
import { BarcodeImage } from "@/components/shared/barcode-image";
import type { RentPaymentAccountRow } from "@/components/properties/rent-payment-accounts-admin";

export function TenantPortalPaymentMethods() {
  const [methods, setMethods] = useState<RentPaymentAccountRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<RentPaymentAccountRow[]>("/api/portal/payment-methods")
      .then(setMethods)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load payment methods"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return <p className="text-red-300">{error}</p>;
  }

  const bankMethods = methods.filter((row) => row.accountType === "BANK");
  const upiMethods = methods.filter((row) => row.accountType === "UPI");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payment Methods</h1>
        <p className="mt-1 text-sm text-slate-400">
          Use these accounts to pay your rent. Contact your property manager if you need help.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading payment methods...</p>
      ) : methods.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-8 text-center text-slate-500">
          No payment methods have been assigned to your account yet.
        </p>
      ) : (
        <>
          {bankMethods.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-white">Bank accounts</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {bankMethods.map((account) => (
                  <article
                    key={account.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <h3 className="text-base font-medium text-sky-300">{account.label}</h3>
                    <dl className="mt-4 space-y-2 text-sm">
                      <Detail label="Account holder" value={account.accountHolderName} />
                      <Detail label="Bank" value={account.bankName} />
                      <Detail label="Account number" value={account.accountNumber} mono />
                      <Detail label="Branch" value={account.branch} />
                      <Detail label="IFSC" value={account.ifscCode} mono />
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {upiMethods.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-white">UPI</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {upiMethods.map((account) => (
                  <article
                    key={account.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <h3 className="text-base font-medium text-sky-300">{account.label}</h3>
                    <p className="mt-3 font-mono text-lg text-white">{account.upiId}</p>
                    {account.upiBarcodeUrl ? (
                      <div className="mt-4">
                        <p className="mb-2 text-sm text-slate-400">Scan to pay</p>
                        <BarcodeImage
                          src={account.upiBarcodeUrl}
                          alt={`${account.label} UPI QR code`}
                          className="max-h-56 rounded-lg border border-slate-700 bg-white p-3"
                        />
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className={`text-right text-slate-200 ${mono ? "font-mono uppercase" : ""}`}>{value}</dd>
    </div>
  );
}
