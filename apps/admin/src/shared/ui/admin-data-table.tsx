import { ArrowDown, ArrowUp, CheckSquare2, Minus, Square, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button, EmptyState, LoadingState } from "./ui";

export type AdminDataColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  sortLabel?: string;
};

export function AdminDataTable<T>({
  rows,
  rowId,
  columns,
  label,
  loading = false,
  error = false,
  emptyTitle = "رکوردی وجود ندارد.",
  onRetry,
  onRowClick,
  activeId,
  selectedIds = [],
  onSelectionChange,
  batchActions,
  sortId,
  sortDirection = "asc",
  onSort,
}: {
  rows: T[];
  rowId: (row: T) => string;
  columns: AdminDataColumn<T>[];
  label: string;
  loading?: boolean;
  error?: boolean;
  emptyTitle?: string;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  activeId?: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  batchActions?: ReactNode | ((selectedRows: T[]) => ReactNode);
  sortId?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (id: string) => void;
}) {
  const selectable = Boolean(onSelectionChange);
  const visibleIds = rows.map(rowId);
  const selected = new Set(selectedIds);
  const selectedVisible = visibleIds.filter((id) => selected.has(id));
  const allSelected = rows.length > 0 && selectedVisible.length === rows.length;
  const partiallySelected = selectedVisible.length > 0 && !allSelected;
  const selectedRows = rows.filter((row) => selected.has(rowId(row)));
  const toggleAll = () =>
    onSelectionChange?.(
      allSelected
        ? selectedIds.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...selectedIds, ...visibleIds])),
    );
  const toggleOne = (id: string) =>
    onSelectionChange?.(
      selected.has(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id],
    );

  if (loading)
    return (
      <div className="p-5">
        <LoadingState label={`در حال دریافت ${label}...`} />
      </div>
    );
  if (error)
    return (
      <div className="p-5">
        <EmptyState
          title={`دریافت ${label} ناموفق بود.`}
          action={
            onRetry ? (
              <Button variant="soft" onClick={onRetry}>
                تلاش دوباره
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  if (!rows.length)
    return (
      <div className="p-5">
        <EmptyState title={emptyTitle} />
      </div>
    );

  return (
    <div className="min-w-0">
      {selectable && selectedIds.length ? (
        <div
          className="flex min-h-12 flex-wrap items-center gap-3 border-b border-brand/20 bg-brand/5 px-3 py-2"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-brand">
            <CheckSquare2 size={17} />
            {selectedIds.length.toLocaleString("fa-IR")} انتخاب‌شده
          </span>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {typeof batchActions === "function" ? batchActions(selectedRows) : batchActions}
          </div>
          <Button variant="ghost" className="mr-auto h-9" onClick={() => onSelectionChange?.([])}>
            <X size={14} />
            لغو انتخاب
          </Button>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr className="border-y border-slate-200 bg-slate-50/70 text-right text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              {selectable ? (
                <th className="w-12 px-3 py-2">
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-md hover:bg-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-slate-800"
                    aria-label={
                      allSelected ? "لغو انتخاب همه موارد این صفحه" : "انتخاب همه موارد این صفحه"
                    }
                    aria-pressed={allSelected}
                    onClick={toggleAll}
                  >
                    {partiallySelected ? (
                      <Minus size={17} />
                    ) : allSelected ? (
                      <CheckSquare2 size={17} className="text-brand" />
                    ) : (
                      <Square size={17} />
                    )}
                  </button>
                </th>
              ) : null}
              {columns.map((column) => (
                <th key={column.id} className={`px-3 py-2 font-semibold ${column.className || ""}`}>
                  {column.sortLabel && onSort ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md px-1 py-1 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      onClick={() => onSort(column.id)}
                      aria-label={`مرتب‌سازی بر اساس ${column.sortLabel}`}
                    >
                      {column.header}
                      {sortId === column.id ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        )
                      ) : null}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => {
              const id = rowId(row),
                checked = selected.has(id),
                active = activeId === id;
              return (
                <tr
                  key={id}
                  className={`${onRowClick ? "cursor-pointer" : ""} transition-colors ${checked || active ? "bg-brand/5 dark:bg-brand/10" : "hover:bg-slate-50 dark:hover:bg-slate-900/70"}`}
                  onClick={() => onRowClick?.(row)}
                  aria-selected={checked || active || undefined}
                >
                  {selectable ? (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="size-4 accent-brand"
                        checked={checked}
                        aria-label={`انتخاب ردیف ${id}`}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleOne(id)}
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td key={column.id} className={`px-3 py-3 ${column.className || ""}`}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
