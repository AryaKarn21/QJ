import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SkeletonRow } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Custom cell renderer; defaults to `String(row[key])` if omitted */
  render?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  /** Skeleton row count while `loading` is true */
  skeletonRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;

  // Pagination (all optional — omit to render a plain, unpaginated table)
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;

  // Row selection (for bulk actions)
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onToggleRow?: (key: string) => void;
  onToggleAll?: (checked: boolean) => void;
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  skeletonRows = 6,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Once there is data matching your filters, it will show up here.',
  onRowClick,
  page,
  totalPages,
  onPageChange,
  selectable = false,
  selectedKeys,
  onToggleRow,
  onToggleAll,
}: DataTableProps<T>) {
  const showPagination = typeof page === 'number' && typeof totalPages === 'number' && onPageChange;
  const allSelected = selectable && data.length > 0 && data.every((row) => selectedKeys?.has(getRowKey(row)));

  return (
    <div className="overflow-hidden rounded-admin-card border border-adminBorder bg-adminCard shadow-admin-card dark:border-slate-700">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-adminBorder bg-adminBg dark:border-slate-700 dark:bg-slate-800/60">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleAll?.(e.target.checked)}
                    aria-label="Select all rows"
                    className="h-4 w-4 rounded border-adminBorder text-adminAccent focus:ring-adminAccent/40"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-adminTextSecondary dark:text-slate-400 ${col.headerClassName ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-adminBorder/70 dark:divide-slate-800">
            {loading &&
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} columns={columns.length + (selectable ? 1 : 0)} />
              ))}

            {!loading &&
              data.map((row) => {
                const key = getRowKey(row);
                const isSelected = selectedKeys?.has(key) ?? false;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={`${onRowClick ? 'cursor-pointer' : ''} transition-colors hover:bg-adminHover dark:hover:bg-slate-800/40 ${isSelected ? 'bg-adminActive/50 dark:bg-violet-500/5' : ''}`}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleRow?.(key)}
                          aria-label="Select row"
                          className="h-4 w-4 rounded border-adminBorder text-adminAccent focus:ring-adminAccent/40"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 text-adminText dark:text-slate-300 ${col.className ?? ''}`}
                      >
                        {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!loading && data.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} className="border-0" />
      )}

      {showPagination && (
        <div className="flex items-center justify-between border-t border-adminBorder px-4 py-3 dark:border-slate-700">
          <span className="text-xs text-adminTextSecondary dark:text-slate-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange!(Math.max(1, page! - 1))}
              disabled={page! <= 1}
              className="flex items-center gap-1 rounded-lg border border-adminBorder px-2.5 py-1.5 text-xs font-medium text-adminText hover:bg-adminHover disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={() => onPageChange!(Math.min(totalPages!, page! + 1))}
              disabled={page! >= totalPages!}
              className="flex items-center gap-1 rounded-lg border border-adminBorder px-2.5 py-1.5 text-xs font-medium text-adminText hover:bg-adminHover disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;