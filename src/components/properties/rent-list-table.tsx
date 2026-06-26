"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { buttonSecondaryClass } from "@/components/admin/ui";
import { RentBreakdownPanel } from "@/components/properties/rent-breakdown-panel";
import type { calcRentBreakdown } from "@/lib/properties/rent-calculations";

export type RentListDisplayRow = {
  id: string;
  startDate: string;
  endDate?: string | null;
  isExitRent?: boolean;
  rent: string | number;
  totalRent?: string | number | null;
  electricityUnits?: string | number | null;
  gasUnits?: string | number | null;
  maintenance?: string | number | null;
  misc?: string | number | null;
  dueDate: string;
  paymentStatus?: "PENDING" | "PARTIAL" | "PAID";
  tenantName?: string;
  breakdown: ReturnType<typeof calcRentBreakdown> | null;
  breakdownSubtitle?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function formatCell(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

function paymentStatusDisplay(status: RentListDisplayRow["paymentStatus"]) {
  if (status === "PAID") {
    return { label: "Paid", className: "font-medium text-emerald-400" };
  }
  if (status === "PARTIAL") {
    return { label: "Partially paid", className: "font-medium text-orange-400" };
  }
  return { label: "Pending", className: "font-medium text-red-400" };
}

const PAGE_SIZE = 20;

export function RentListTable({
  rows,
  loading = false,
  emptyMessage = "No rent records yet.",
  showTenantColumn = false,
  showPaymentStatus = false,
  renderActions,
}: {
  rows: RentListDisplayRow[];
  loading?: boolean;
  emptyMessage?: string;
  showTenantColumn?: boolean;
  showPaymentStatus?: boolean;
  renderActions?: (
    row: RentListDisplayRow,
    context: { isViewing: boolean; toggleView: () => void },
  ) => ReactNode;
}) {
  const [viewingRentId, setViewingRentId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [rows],
  );
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = sortedRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const colSpan =
    (showTenantColumn ? 1 : 0) + (showPaymentStatus ? 1 : 0) + 10;

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr className="whitespace-nowrap">
              {showTenantColumn ? <th className="px-3 py-3">Tenant</th> : null}
              <th className="px-3 py-3">From</th>
              <th className="px-3 py-3">To</th>
              <th className="px-3 py-3">Rent</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Elec.</th>
              <th className="px-3 py-3">Gas</th>
              <th className="px-3 py-3">Maint.</th>
              <th className="px-3 py-3">Misc</th>
              <th className="px-3 py-3">Due</th>
              {showPaymentStatus ? <th className="px-3 py-3">Status</th> : null}
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const isViewing = viewingRentId === row.id;
                const toggleView = () => setViewingRentId(isViewing ? null : row.id);

                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-slate-800 whitespace-nowrap">
                      {showTenantColumn ? (
                        <td className="px-3 py-3">
                          {row.tenantName ?? "—"}
                          {row.isExitRent ? (
                            <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-200">
                              Exit
                            </span>
                          ) : null}
                        </td>
                      ) : null}
                      <td className="px-3 py-3">
                        {formatDate(row.startDate)}
                        {!showTenantColumn && row.isExitRent ? (
                          <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-200">
                            Exit
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">{formatDate(row.endDate)}</td>
                      <td className="px-3 py-3">{formatCell(row.rent)}</td>
                      <td className="px-3 py-3">{formatCell(row.totalRent)}</td>
                      <td className="px-3 py-3">{formatCell(row.electricityUnits)}</td>
                      <td className="px-3 py-3">{formatCell(row.gasUnits)}</td>
                      <td className="px-3 py-3">{formatCell(row.maintenance)}</td>
                      <td className="px-3 py-3">{formatCell(row.misc)}</td>
                      <td className="px-3 py-3">{formatDate(row.dueDate)}</td>
                      {showPaymentStatus ? (
                        <td className="px-3 py-3">
                          {(() => {
                            const status = paymentStatusDisplay(row.paymentStatus);
                            return <span className={status.className}>{status.label}</span>;
                          })()}
                        </td>
                      ) : null}
                      <td className="px-3 py-3">
                        <div className="flex flex-nowrap items-center gap-2">
                          {row.breakdown ? (
                            <button
                              type="button"
                              className={buttonSecondaryClass}
                              onClick={toggleView}
                            >
                              {isViewing ? "Hide" : "Breakdown"}
                            </button>
                          ) : null}
                          {renderActions?.(row, { isViewing, toggleView })}
                        </div>
                      </td>
                    </tr>
                    {isViewing && row.breakdown ? (
                      <tr className="border-t border-slate-800 bg-slate-950/40">
                        <td colSpan={colSpan} className="px-4 py-4">
                          <RentBreakdownPanel
                            breakdown={row.breakdown}
                            subtitle={
                              row.breakdownSubtitle ??
                              (row.endDate
                                ? `${formatDate(row.startDate)} to ${formatDate(row.endDate)}`
                                : formatDate(row.startDate))
                            }
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sortedRows.length > 0 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <p>
            Page {currentPage} of {totalPages} ({sortedRows.length} records)
          </p>
          {totalPages > 1 ? (
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonSecondaryClass}
                disabled={currentPage <= 1 || loading}
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className={buttonSecondaryClass}
                disabled={currentPage >= totalPages || loading}
                onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
