export function normalizeGstNumber(value: string): string {
  return value.trim().replace(/\s/g, "").toUpperCase();
}

export function formatGstNumberInput(value: string): string {
  return value.toUpperCase();
}
