export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export type PaymentModeValue = "CASH" | "CHEQUE" | "NEFT" | "UPI" | "OTHER";

export type PaymentAccountNameValue = "AMIT" | "SARITA" | "PYARI" | "DN" | "NONE";

export const PAYMENT_ACCOUNT_NAMES: PaymentAccountNameValue[] = [
  "AMIT",
  "SARITA",
  "PYARI",
  "DN",
  "NONE",
];

type MoneyInput = string | number | { toString(): string } | null | undefined;

export function toMoney(value: MoneyInput) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function rentBillAmount(rent: {
  rent: MoneyInput;
  totalRent?: MoneyInput;
}) {
  return rent.totalRent != null ? toMoney(rent.totalRent) : toMoney(rent.rent);
}

export function rentAmountDue(rent: {
  rent: MoneyInput;
  totalRent?: MoneyInput;
  priorBalance?: MoneyInput;
  balanceCarriedForward?: boolean;
}) {
  if (rent.balanceCarriedForward) return 0;
  return rentBillAmount(rent) + toMoney(rent.priorBalance);
}

export function paidTowardRent(
  payments: Array<{ appliedToRent?: MoneyInput }>,
) {
  return payments.reduce((sum, payment) => sum + toMoney(payment.appliedToRent), 0);
}

export function balanceDue(
  rent: {
    rent: MoneyInput;
    totalRent?: MoneyInput;
    priorBalance?: MoneyInput;
    balanceCarriedForward?: boolean;
  },
  payments: Array<{ appliedToRent?: MoneyInput }>,
) {
  if (rent.balanceCarriedForward) return 0;
  return Math.max(0, rentAmountDue(rent) - paidTowardRent(payments));
}

export function derivePaymentStatus(
  amountDue: number,
  paid: number,
  balance: number,
): PaymentStatus {
  if (amountDue <= 0 || balance <= 0) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "PENDING";
}

export function splitPaymentAmount(amount: number, outstandingBalance: number) {
  const appliedToRent = Math.min(amount, Math.max(0, outstandingBalance));
  const toAdvance = Math.max(0, amount - appliedToRent);
  return { appliedToRent, toAdvance };
}

export function formatMoney(value: number) {
  return `₹${value.toFixed(2)}`;
}

export function paymentModeLabel(mode: PaymentModeValue) {
  if (mode === "NEFT") return "NEFT";
  if (mode === "UPI") return "UPI";
  return mode.charAt(0) + mode.slice(1).toLowerCase();
}

export function paymentAccountNameLabel(accountName: PaymentAccountNameValue) {
  if (accountName === "DN") return "DN";
  if (accountName === "NONE") return "None";
  return accountName.charAt(0) + accountName.slice(1).toLowerCase();
}

export function paymentStatusLabel(status: PaymentStatus) {
  if (status === "PARTIAL") return "Partially paid";
  if (status === "PAID") return "Paid";
  return "Pending";
}
