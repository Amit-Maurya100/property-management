import {
  derivePaymentStatus,
  toMoney,
  type PaymentStatus,
} from "@/lib/properties/payment-calculations";

export function invoiceAmountDue(invoice: { invoiceValue: Parameters<typeof toMoney>[0] }) {
  return toMoney(invoice.invoiceValue);
}

export function paidTowardInvoice(
  payments: Array<{ appliedToInvoice?: Parameters<typeof toMoney>[0] }>,
) {
  return payments.reduce((sum, payment) => sum + toMoney(payment.appliedToInvoice), 0);
}

export function gstInvoiceBalanceDue(
  invoice: { invoiceValue: Parameters<typeof toMoney>[0] },
  payments: Array<{ appliedToInvoice?: Parameters<typeof toMoney>[0] }>,
) {
  return Math.max(0, invoiceAmountDue(invoice) - paidTowardInvoice(payments));
}

export function splitGstPaymentAmount(amount: number, outstandingBalance: number) {
  if (amount <= 0) {
    throw new Error("BAD_REQUEST:Payment amount must be greater than zero");
  }
  if (amount > outstandingBalance) {
    throw new Error("BAD_REQUEST:Payment amount exceeds invoice balance");
  }
  return { appliedToInvoice: amount };
}

export function deriveGstInvoicePaymentStatus(
  amountDue: number,
  paid: number,
  balance: number,
): PaymentStatus {
  return derivePaymentStatus(amountDue, paid, balance);
}
