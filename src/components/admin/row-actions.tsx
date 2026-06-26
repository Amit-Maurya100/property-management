import { buttonDangerClass, buttonSecondaryClass } from "@/components/admin/ui";

type RowActionsProps = {
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  hideDelete?: boolean;
  deleting?: boolean;
  disabled?: boolean;
};

export function RowActions({
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  hideDelete = false,
  deleting = false,
  disabled = false,
}: RowActionsProps) {
  const showDelete = canDelete && !hideDelete;
  const isBusy = disabled || deleting;

  if (!canUpdate && !showDelete) {
    return <span className="text-slate-500">—</span>;
  }

  return (
    <div className="space-x-2">
      {canUpdate ? (
        <button
          type="button"
          className={buttonSecondaryClass}
          onClick={onEdit}
          disabled={isBusy}
        >
          Edit
        </button>
      ) : null}
      {showDelete ? (
        <button
          type="button"
          className={buttonDangerClass}
          onClick={onDelete}
          disabled={isBusy}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      ) : null}
    </div>
  );
}
