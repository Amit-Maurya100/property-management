"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ADMIN_QUOTE_REQUEST_STATUSES,
  quoteRequestStatusClass,
  quoteRequestStatusLabel,
  QUOTE_REQUEST_STATUSES,
} from "@/lib/admin/quote-request-status";
import { buttonSecondaryClass, inputClass } from "@/components/admin/ui";
import { fetchMutation } from "@/lib/api/client-cache";
import { useCachedFetch } from "@/hooks/use-cached-fetch";

type QuoteRequestRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  company: string | null;
  interest: string;
  message: string | null;
  status: string;
  ipAddress: string | null;
  createdAt: string;
};

type QuoteRequestsResponse = {
  items: QuoteRequestRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function QuoteRequestsAdmin() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (appliedFilters.status) {
      params.set("status", appliedFilters.status);
    }
    return `/api/admin/quote-requests?${params}`;
  }, [appliedFilters, page]);

  const { data, loading, error, reload } = useCachedFetch<QuoteRequestsResponse>(listUrl);

  function handleFilterSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  }

  function clearFilters() {
    const empty = { status: "" };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  }

  async function handleStatusChange(id: number, status: (typeof ADMIN_QUOTE_REQUEST_STATUSES)[number]) {
    setActionError(null);
    setUpdatingId(id);
    try {
      await fetchMutation(`/api/admin/quote-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await reload(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading && !data) {
    return <p className="text-slate-400">Loading quote requests...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Quote Requests</h1>
        <p className="mt-2 text-slate-400">
          Website quote submissions, newest first. Update status as you follow up.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </p>
      ) : null}

      <form
        onSubmit={handleFilterSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4"
      >
        <h2 className="text-lg font-medium">Filters</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <select
            className={inputClass}
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
          >
            <option value="">All statuses</option>
            {QUOTE_REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {quoteRequestStatusLabel(status)}
              </option>
            ))}
          </select>
          <div className="flex gap-3 md:col-span-2">
            <button type="submit" className={buttonSecondaryClass} disabled={loading}>
              {loading ? "Loading..." : "Apply"}
            </button>
            <button
              type="button"
              className={buttonSecondaryClass}
              onClick={clearFilters}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Interest</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length ? (
              data.items.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.name}</td>
                  <td className="px-4 py-3">
                    <div>{entry.phone}</div>
                    {entry.email ? (
                      <a
                        href={`mailto:${entry.email}`}
                        className="block text-xs text-sky-400 hover:underline"
                      >
                        {entry.email}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">No email</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{entry.company ?? "—"}</td>
                  <td className="px-4 py-3">{entry.interest}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="line-clamp-3 whitespace-pre-wrap" title={entry.message ?? undefined}>
                      {entry.message ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {entry.status === "NEW" ? (
                      <span className={`font-medium ${quoteRequestStatusClass(entry.status)}`}>
                        {quoteRequestStatusLabel(entry.status)}
                      </span>
                    ) : null}
                    <select
                      className={`${inputClass} mt-1 min-w-[9rem]`}
                      value={
                        entry.status === "NEW"
                          ? ""
                          : ADMIN_QUOTE_REQUEST_STATUSES.includes(
                                entry.status as (typeof ADMIN_QUOTE_REQUEST_STATUSES)[number],
                              )
                            ? entry.status
                            : ""
                      }
                      disabled={updatingId === entry.id || loading}
                      onChange={(e) => {
                        const next = e.target.value as (typeof ADMIN_QUOTE_REQUEST_STATUSES)[number];
                        if (next) {
                          void handleStatusChange(entry.id, next);
                        }
                      }}
                    >
                      {entry.status === "NEW" ? (
                        <option value="">Set status…</option>
                      ) : null}
                      {ADMIN_QUOTE_REQUEST_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {quoteRequestStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{entry.ipAddress ?? "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No quote requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <p>
            Page {data.page} of {data.totalPages} ({data.total} records)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonSecondaryClass}
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className={buttonSecondaryClass}
              disabled={page >= data.totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
