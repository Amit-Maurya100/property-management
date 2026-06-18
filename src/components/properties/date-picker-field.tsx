import { inputClass } from "@/components/admin/ui";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  allowPastValue?: string;
};

export function DatePickerField({
  label,
  value,
  onChange,
  required = false,
  allowPastValue,
}: DatePickerFieldProps) {
  const today = todayIso();
  const minDate =
    allowPastValue && allowPastValue < today ? allowPastValue : today;

  return (
    <div>
      <label className="mb-1 block text-sm text-slate-300">{label}</label>
      <input
        type="date"
        required={required}
        min={minDate}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} scheme-dark`}
      />
    </div>
  );
}

export { todayIso };
