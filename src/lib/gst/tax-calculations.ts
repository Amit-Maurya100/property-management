export type TaxRates = {
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
};

export type CalculatedInvoiceTax = {
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTaxAmount: number;
  invoiceValue: number;
  isIntrastate: boolean;
};

export { normalizeGstNumber } from "@/lib/gst/gst-number";
import { normalizeGstNumber } from "@/lib/gst/gst-number";

export function gstStateCode(gstNumber: string) {
  return normalizeGstNumber(gstNumber).slice(0, 2);
}

export function isSameGstState(
  organizationGstNumber: string,
  partyGstNumber?: string | null,
) {
  if (!partyGstNumber) return true;
  return gstStateCode(organizationGstNumber) === gstStateCode(partyGstNumber);
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function isTaxConfigExpired(endDate: Date, reference = new Date()) {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);
  return end < today;
}

export function isTaxConfigActive(
  startDate: Date,
  endDate: Date,
  onDate: Date,
) {
  const date = new Date(onDate);
  date.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return date >= start && date <= end;
}

export function calculateInvoiceTax(input: {
  taxableValue: number;
  cess?: number;
  organizationGstNumber: string;
  partyGstNumber?: string | null;
  rates: TaxRates;
}): CalculatedInvoiceTax {
  const taxableValue = Math.max(0, input.taxableValue);
  const cess = Math.max(0, input.cess ?? 0);
  const intrastate = isSameGstState(input.organizationGstNumber, input.partyGstNumber);

  if (intrastate) {
    const cgst = roundMoney((taxableValue * input.rates.cgstRate) / 100);
    const sgst = roundMoney((taxableValue * input.rates.sgstRate) / 100);
    const totalTaxAmount = roundMoney(cgst + sgst + cess);
    return {
      cgst,
      sgst,
      igst: 0,
      cess,
      totalTaxAmount,
      invoiceValue: roundMoney(taxableValue + totalTaxAmount),
      isIntrastate: true,
    };
  }

  const igst = roundMoney((taxableValue * input.rates.igstRate) / 100);
  const totalTaxAmount = roundMoney(igst + cess);
  return {
    cgst: 0,
    sgst: 0,
    igst,
    cess,
    totalTaxAmount,
    invoiceValue: roundMoney(taxableValue + totalTaxAmount),
    isIntrastate: false,
  };
}

export function toMoney(value: string | number | { toString(): string } | null | undefined) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
