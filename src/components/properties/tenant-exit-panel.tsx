"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { buttonPrimaryClass, buttonSecondaryClass, inputClass } from "@/components/admin/ui";
import { DatePickerField } from "@/components/properties/date-picker-field";
import { RentBreakdownPanel } from "@/components/properties/rent-breakdown-panel";
import type { BuildingUtilityRateSnapshot } from "@/lib/properties/building-utility-types";
import { readApiError, readApiJson } from "@/lib/api/parse-response";
import {
  calcDefaultRentPeriodStart,
  calcDueDateFromPeriodStart,
  calcRentBreakdown,
  resolveUtilityBaselines,
  toNumber,
} from "@/lib/properties/rent-calculations";

type AssignmentRow = {
  id: string;
  monthlyRent?: string | null;
  monthlyDueDay?: number | null;
  leaseFrom?: string | null;
  initialGasUnits?: string | null;
  initialElectricityUnits?: string | null;
  isActive: boolean;
  unit: { id: string; unitNumber: string };
};

type TenantRentRow = {
  id: string;
  startDate: string;
  endDate?: string | null;
  electricityUnits?: string | null;
  gasUnits?: string | null;
};

const emptyExitForm = {
  startDate: "",
  endDate: "",
  electricityUnits: "",
  gasUnits: "",
  maintenance: "",
  misc: "",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function findLatestRent(rents: TenantRentRow[]) {
  return [...rents].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

export function TenantExitPanel({
  tenantId,
  tenantName,
  assignment,
  tenantRents,
  canCreate,
  onCompleted,
}: {
  tenantId: string;
  tenantName: string;
  assignment: AssignmentRow;
  tenantRents: TenantRentRow[];
  canCreate: boolean;
  onCompleted: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitForm, setExitForm] = useState(emptyExitForm);
  const [utilityRates, setUtilityRates] = useState<BuildingUtilityRateSnapshot | null>(null);
  const [utilityRateError, setUtilityRateError] = useState<string | null>(null);

  const monthlyRent =
    assignment.monthlyRent != null ? toNumber(assignment.monthlyRent) : null;

  useEffect(() => {
    if (!showForm || !assignment.unit.id || !exitForm.startDate) {
      setUtilityRates(null);
      setUtilityRateError(null);
      return;
    }

    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/buildings/utility-rates/active?unitId=${assignment.unit.id}&date=${exitForm.startDate}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(await readApiError(res));
        setUtilityRates(await readApiJson<BuildingUtilityRateSnapshot>(res));
        setUtilityRateError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setUtilityRates(null);
        setUtilityRateError(err instanceof Error ? err.message : "Utility rates unavailable");
      }
    })();

    return () => controller.abort();
  }, [showForm, assignment.unit.id, exitForm.startDate]);

  const exitContext = useMemo(() => {
    if (!monthlyRent || !exitForm.startDate || !exitForm.endDate) return null;

    const monthlyBills = tenantRents.map((row) => ({
      id: row.id,
      startDate: row.startDate,
      electricityUnits: row.electricityUnits,
      gasUnits: row.gasUnits,
    }));

    const baselineResult = resolveUtilityBaselines({
      assignment,
      monthlyBills,
      periodStartDate: exitForm.startDate,
    });

    const dueDate =
      assignment.monthlyDueDay != null
        ? calcDueDateFromPeriodStart(exitForm.startDate, assignment.monthlyDueDay)
        : exitForm.endDate;

    const breakdown =
      utilityRates != null
        ? calcRentBreakdown({
            monthlyRent,
            electricityUnits: toNumber(exitForm.electricityUnits),
            gasUnits: toNumber(exitForm.gasUnits),
            baselineElectricityUnits: baselineResult.electricityUnits,
            baselineGasUnits: baselineResult.gasUnits,
            maintenance: toNumber(exitForm.maintenance),
            misc: toNumber(exitForm.misc),
            rates: utilityRates,
            prorataPeriod: {
              startDateIso: exitForm.startDate,
              endDateIso: exitForm.endDate,
            },
          })
        : null;

    return {
      baselineResult,
      dueDate,
      breakdown,
      totalRent: breakdown?.total ?? null,
    };
  }, [monthlyRent, exitForm, tenantRents, assignment, utilityRates]);

  function openExitForm() {
    const latestRent = findLatestRent(tenantRents);
    const startDate = calcDefaultRentPeriodStart({
      latestRent,
      leaseFrom: assignment.leaseFrom ?? null,
    });

    setExitForm({
      ...emptyExitForm,
      startDate,
      endDate: startDate ? new Date().toISOString().slice(0, 10) : "",
      electricityUnits:
        latestRent?.electricityUnits != null ? String(latestRent.electricityUnits) : "",
      gasUnits: latestRent?.gasUnits != null ? String(latestRent.gasUnits) : "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!exitContext || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/exit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: exitForm.startDate,
          endDate: exitForm.endDate,
          electricityUnits: exitForm.electricityUnits
            ? Number(exitForm.electricityUnits)
            : undefined,
          gasUnits: exitForm.gasUnits ? Number(exitForm.gasUnits) : undefined,
          maintenance: exitForm.maintenance ? Number(exitForm.maintenance) : undefined,
          misc: exitForm.misc ? Number(exitForm.misc) : undefined,
          dueDate: exitContext.dueDate,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setShowForm(false);
      setExitForm(emptyExitForm);
      await onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record tenant exit");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canCreate || !assignment.isActive) {
    return null;
  }

  return (
    <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-amber-100">Tenant exit</h3>
          <p className="mt-1 text-xs text-slate-400">
            Record final pro-rata rent for a partial period, then deactivate the assignment.
            Base rent uses (monthly rent ÷ 30) × days between From and To.
          </p>
        </div>
        {!showForm ? (
          <button type="button" className={buttonSecondaryClass} onClick={openExitForm}>
            Record exit
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <fieldset disabled={submitting} className="contents min-w-0 border-0 p-0">
            <p className="md:col-span-2 text-sm text-slate-300">
              Exit rent for {tenantName} · Unit {assignment.unit.unitNumber} · Monthly rent{" "}
              {monthlyRent != null ? `₹${monthlyRent.toFixed(2)}` : "—"}
            </p>

            <DatePickerField
              label="From"
              required
              value={exitForm.startDate}
              allowPastDates
              onChange={(startDate) => setExitForm((prev) => ({ ...prev, startDate }))}
            />
            <DatePickerField
              label="To (exit date)"
              required
              value={exitForm.endDate}
              allowPastDates
              onChange={(endDate) => setExitForm((prev) => ({ ...prev, endDate }))}
            />

            <div>
              <label className="mb-1 block text-sm text-slate-300">Due date</label>
              <input
                readOnly
                value={exitContext?.dueDate || "Set period dates"}
                className={`${inputClass} opacity-80`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">Electricity units (current)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={exitForm.electricityUnits}
                onChange={(e) =>
                  setExitForm((prev) => ({ ...prev, electricityUnits: e.target.value }))
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">Gas units (current)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={exitForm.gasUnits}
                onChange={(e) =>
                  setExitForm((prev) => ({ ...prev, gasUnits: e.target.value }))
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">Maintenance</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={exitForm.maintenance}
                onChange={(e) =>
                  setExitForm((prev) => ({ ...prev, maintenance: e.target.value }))
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">Misc</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={exitForm.misc}
                onChange={(e) =>
                  setExitForm((prev) => ({ ...prev, misc: e.target.value }))
                }
                className={inputClass}
              />
            </div>

            {utilityRateError ? (
              <div className="md:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {utilityRateError}
              </div>
            ) : null}

            {exitContext?.breakdown ? (
              <RentBreakdownPanel
                breakdown={exitContext.breakdown}
                subtitle={[
                  tenantName,
                  `${exitForm.startDate} to ${exitForm.endDate}`,
                  "Exit rent (pro-rata)",
                ].join(" · ")}
              />
            ) : null}

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className={buttonPrimaryClass}
                disabled={
                  submitting ||
                  !exitForm.startDate ||
                  !exitForm.endDate ||
                  exitForm.endDate < exitForm.startDate ||
                  !utilityRates ||
                  !!utilityRateError
                }
              >
                {submitting ? "Recording exit..." : "Confirm tenant exit"}
              </button>
              <button
                type="button"
                className={buttonSecondaryClass}
                disabled={submitting}
                onClick={() => {
                  setShowForm(false);
                  setExitForm(emptyExitForm);
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      ) : null}
    </div>
  );
}
