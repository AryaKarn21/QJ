import React from 'react';
import { X } from 'lucide-react';

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  onClick: () => void;
}

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  entityLabel?: string;
  actions: BulkAction[];
}

/**
 * Appears once one or more rows are selected in a DataTable-backed list.
 * Shows a count, a "clear selection" control, and whatever bulk actions
 * that module supports (delete, export, status change, …).
 */
export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedIds,
  onClearSelection,
  entityLabel = 'item',
  actions,
}) => {
  return (
    <div className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2 dark:bg-violet-500/10">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
          {selectedIds.length} {entityLabel}
          {selectedIds.length === 1 ? '' : 's'} selected
        </span>
        <button
          onClick={onClearSelection}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-violet-500 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-500/20"
        >
          <X size={12} /> Clear
        </button>
      </div>

      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
              action.variant === 'danger'
                ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BulkActionsBar;