import "dotenv/config";
import { prisma } from "../src/lib/db";
import { resolveReportDateRange } from "../src/lib/gst/report-periods";
import {
  breakdownFromRentRow,
  formatIsoDate,
} from "../src/lib/properties/rent-calculations";
import { toMoney, rentBillAmount } from "../src/lib/properties/payment-calculations";

const MONTH = process.argv[2] ?? "2026-06";

async function main() {
  const period = resolveReportDateRange({ mode: "monthly", month: MONTH });

  const rents = await prisma.rent.findMany({
    where: {
      startDate: { gte: period.startDate, lte: period.endDate },
    },
    select: {
      id: true,
      tenantId: true,
      startDate: true,
      endDate: true,
      rent: true,
      totalRent: true,
      electricityUnits: true,
      gasUnits: true,
      maintenance: true,
      misc: true,
      priorBalance: true,
      utilityBaseline: true,
      utilityRateSnapshot: true,
      tenantAssignment: {
        select: { initialElectricityUnits: true, initialGasUnits: true },
      },
      tenant: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
  });

  const tenantIds = [...new Set(rents.map((r) => r.tenantId))];
  const allBills = await prisma.rent.findMany({
    where: { tenantId: { in: tenantIds } },
    select: {
      id: true,
      tenantId: true,
      startDate: true,
      electricityUnits: true,
      gasUnits: true,
      utilityBaseline: true,
    },
    orderBy: { startDate: "desc" },
  });

  const billsByTenant = new Map<bigint, typeof allBills>();
  for (const bill of allBills) {
    const list = billsByTenant.get(bill.tenantId) ?? [];
    list.push(bill);
    billsByTenant.set(bill.tenantId, list);
  }

  console.log(`\n=== Rent Report: ${period.label} (${formatIsoDate(period.startDate)} to ${formatIsoDate(period.endDate)}) ===\n`);
  console.log(`Bills in period: ${rents.length}\n`);

  let totalElec = 0;
  let totalGas = 0;
  let totalReport = 0;

  for (const row of rents) {
    const tenantBills = billsByTenant.get(row.tenantId) ?? [];
    const breakdown = breakdownFromRentRow(
      {
        id: String(row.id),
        startDate: formatIsoDate(row.startDate),
        endDate: row.endDate ? formatIsoDate(row.endDate) : null,
        rent: toMoney(row.rent),
        electricityUnits: toMoney(row.electricityUnits),
        gasUnits: toMoney(row.gasUnits),
        maintenance: toMoney(row.maintenance),
        misc: toMoney(row.misc),
        utilityBaseline: row.utilityBaseline,
        utilityRateSnapshot: row.utilityRateSnapshot,
      },
      {
        assignment: {
          initialElectricityUnits: toMoney(row.tenantAssignment.initialElectricityUnits),
          initialGasUnits: toMoney(row.tenantAssignment.initialGasUnits),
        },
        monthlyBills: tenantBills.map((b) => ({
          id: String(b.id),
          startDate: formatIsoDate(b.startDate),
          electricityUnits: toMoney(b.electricityUnits),
          gasUnits: toMoney(b.gasUnits),
          utilityBaseline: b.utilityBaseline,
        })),
      },
    );

    const name = `${row.tenant.firstName} ${row.tenant.lastName}`;
    const storedTotal = rentBillAmount(row) + toMoney(row.priorBalance);

    console.log(`--- ${name} | Rent #${row.id} | From ${formatIsoDate(row.startDate)} ---`);
    console.log(`  Readings: elec=${toMoney(row.electricityUnits)} gas=${toMoney(row.gasUnits)}`);
    console.log(`  Stored baseline:`, JSON.stringify(row.utilityBaseline));
    console.log(`  Rates snapshot:`, JSON.stringify(row.utilityRateSnapshot));

    if (breakdown) {
      console.log(
        `  Breakdown: elec Δ=${breakdown.electricityDelta} (base ${breakdown.electricityBaseline}) × ₹${breakdown.electricityUnitRate} = ₹${breakdown.electricityCharge.toFixed(2)}`,
      );
      console.log(
        `             gas Δ=${breakdown.gasDelta} (base ${breakdown.gasBaseline}) × ₹${breakdown.gasUnitRate} = ₹${breakdown.gasCharge.toFixed(2)}`,
      );
      console.log(`  Computed total (no prior): ₹${breakdown.total.toFixed(2)} | Stored totalRent+prior: ₹${storedTotal.toFixed(2)}`);
      totalElec += breakdown.electricityCharge;
      totalGas += breakdown.gasCharge;
      totalReport += breakdown.total + toMoney(row.priorBalance);
    } else {
      console.log(`  ⚠ Breakdown NULL — report shows elec/gas as 0, total uses stored totalRent`);
      console.log(`  Stored totalRent+prior: ₹${storedTotal.toFixed(2)}`);
      totalReport += storedTotal;
    }
    console.log();
  }

  console.log("=== REPORT TOTALS (overallRent components) ===");
  console.log(`  Electricity: ₹${totalElec.toFixed(2)}`);
  console.log(`  Gas:         ₹${totalGas.toFixed(2)}`);
  console.log(`  Total:       ₹${totalReport.toFixed(2)}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
