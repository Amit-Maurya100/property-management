"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { buttonSecondaryClass, inputClass } from "@/components/admin/ui";

type LoginAuditRow = {
  id: string;
  email: string | null;
  attemptType: "SUCCESS" | "FAILURE" | "LOCKED";
  attemptTime: string;
  ipAddress: string | null;
  userAgent: string | null;
  failureReason: string | null;
  user: {
    id: string;
    username: string;
    email: string;
  } | null;
};

type LoginAuditResponse = {
  items: LoginAuditRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const attemptTypeStyles: Record<LoginAuditRow["attemptType"], string> = {
  SUCCESS: "text-emerald-400",
  FAILURE: "text-red-400",
  LOCKED: "text-amber-400",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function LoginAuditAdmin() {
  const [data, setData] = useState<LoginAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    attemptType: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (appliedFilters.search) {
        params.set("search", appliedFilters.search);
      }
      if (appliedFilters.attemptType) {
        params.set("attemptType", appliedFilters.attemptType);
      }

      const response = await fetch(`/api/admin/login-audit?${params}`);
      if (!response.ok) throw new Error((await response.json()).error);
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load login audit");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFilterSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  }

  function clearFilters() {
    const empty = { search: "", attemptType: "" };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  }

  if (loading && !data) {
    return <p className="text-slate-400">Loading login audit...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Login Audit</h1>
        <p className="mt-2 text-slate-400">
          Read-only history of login attempts, lockouts, and successful sign-ins.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleFilterSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4"
      >
        <h2 className="text-lg font-medium">Filters</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <input
            className={inputClass}
            placeholder="Search by username or email"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className={inputClass}
            value={filters.attemptType}
            onChange={(e) => setFilters({ ...filters, attemptType: e.target.value })}
          >
            <option value="">All attempt types</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
            <option value="LOCKED">LOCKED</option>
          </select>
          <div className="flex gap-3">
            <button type="submit" className={buttonSecondaryClass}>
              Apply
            </button>
            <button type="button" className={buttonSecondaryClass} onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">User Agent</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length ? (
              data.items.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDateTime(entry.attemptTime)}
                  </td>
                  <td className="px-4 py-3">{entry.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    {entry.user ? (
                      <span>
                        {entry.user.username}
                        <span className="block text-xs text-slate-500">{entry.user.email}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`px-4 py-3 font-medium ${attemptTypeStyles[entry.attemptType]}`}>
                    {entry.attemptType}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{entry.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3 max-w-xs truncate" title={entry.userAgent ?? undefined}>
                    {entry.userAgent ?? "—"}
                  </td>
                  <td className="px-4 py-3">{entry.failureReason ?? "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No login audit records found.
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
