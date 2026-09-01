import React from 'react';
import { Search } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters: Record<string, string>;
  filterConfigs: FilterConfig[];
  onFilterChange: (key: string, value: string) => void;
  resultCount?: number;
  resultLabel?: string;
  actions?: React.ReactNode;
}

/**
 * Search input + a row of facet filter dropdowns, used at the top of every
 * list module (Users, Jobs, Applications, Transactions, …). Each filter
 * config always gets an implicit "All" option prepended.
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  filterConfigs,
  onFilterChange,
  resultCount,
  resultLabel = 'result',
  actions,
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-violet-500/20"
          />
        </div>

        {filterConfigs.map((config) => (
          <select
            key={config.key}
            value={filters[config.key] ?? 'all'}
            onChange={(e) => onFilterChange(config.key, e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:focus:ring-violet-500/20"
          >
            <option value="all">All {config.label}</option>
            {config.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}

        {typeof resultCount === 'number' && (
          <span className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
            {resultCount} {resultLabel}
            {resultCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
};

export default FilterBar;