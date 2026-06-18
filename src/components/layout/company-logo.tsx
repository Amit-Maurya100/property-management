export function CompanyLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" className="fill-emerald-500" />
      <path
        d="M10 22L20 12L30 22V30H24V24H16V30H10V22Z"
        className="fill-slate-950"
      />
    </svg>
  );
}
