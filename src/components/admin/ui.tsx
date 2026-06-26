export const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2";

export const buttonPrimaryClass =
  "rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60";

export const buttonSecondaryClass =
  "rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-60";

export const buttonDangerClass =
  "rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-60";

export function saveButtonLabel(options: {
  submitting: boolean;
  isEdit: boolean;
  createLabel?: string;
  updateLabel?: string;
}): string {
  const { submitting, isEdit, createLabel = "Create", updateLabel = "Update" } = options;
  if (submitting) return isEdit ? "Updating..." : "Adding...";
  return isEdit ? updateLabel : createLabel;
}
