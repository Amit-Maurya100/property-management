import { buttonDangerClass, buttonSecondaryClass } from "@/components/admin/ui";

type RowActionsProps = {
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  hideDelete?: boolean;
};

export function RowActions({
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  hideDelete = false,
}: RowActionsProps) {
  const showDelete = canDelete && !hideDelete;

  if (!canUpdate && !showDelete) {
    return <span className="text-slate-500">—</span>;
  }

  return (
    <div className="space-x-2">
      {canUpdate ? (
        <button type="button" className={buttonSecondaryClass} onClick={onEdit}>
          Edit
        </button>
      ) : null}
      {showDelete ? (
        <button type="button" className={buttonDangerClass} onClick={onDelete}>
          Delete
        </button>
      ) : null}
    </div>
  );
}
