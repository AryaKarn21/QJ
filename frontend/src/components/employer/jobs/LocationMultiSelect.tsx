import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Plus } from 'lucide-react';

interface LocationOption {
  value: string;
  label: string;
  group?: string;
}

interface LocationMultiSelectProps {
  value: string[];
  onChange: (locations: string[]) => void;
  options: LocationOption[];
  placeholder?: string;
  error?: string;
}

// Chip-based multi-select for a job's preferred location(s) — 1, 2, 3, or
// more on the same field, replacing the single CustomSelect this form used
// before. Mirrors the same searchable-listbox pattern already established
// in NationalitySelect.tsx/LanguageSelect.tsx (resumeBuilder), just with
// multiple selections shown as removable chips instead of one value.
export const LocationMultiSelect: React.FC<LocationMultiSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Search city or location…',
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedSet = new Set(value.map((v) => v.toLowerCase()));
  const realOptions = options.filter((o) => o.value !== 'Other');
  const filtered = realOptions.filter((o) => {
    if (selectedSet.has(o.value.toLowerCase())) return false;
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return o.label.toLowerCase().includes(q);
  });

  const addLocation = (loc: string) => {
    const trimmed = loc.trim();
    if (!trimmed || selectedSet.has(trimmed.toLowerCase())) return;
    onChange([...value, trimmed]);
    setQuery('');
  };

  const removeLocation = (loc: string) => {
    onChange(value.filter((v) => v !== loc));
  };

  const showAddCustom = query.trim().length > 0 && !filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen(true)}
        className={`flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2.5 py-1.5 text-sm transition dark:bg-gray-800 ${
          error ? 'border-red-500' : isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
        }`}
      >
        {value.map((loc) => (
          <span
            key={loc}
            className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
          >
            {loc}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeLocation(loc);
              }}
              className="rounded-full p-0.5 hover:bg-primary/20"
              aria-label={`Remove ${loc}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              e.preventDefault();
              addLocation(query.trim());
            } else if (e.key === 'Backspace' && !query && value.length > 0) {
              removeLocation(value[value.length - 1]);
            }
          }}
          placeholder={value.length === 0 ? placeholder : '+ Add location'}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-gray-100"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden dark:border-gray-700 dark:bg-gray-800">
          <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-1.5 dark:border-gray-700 dark:bg-gray-900">
            <Search size={13} className="text-gray-400 shrink-0 ml-1" />
            <span className="text-xs text-gray-400">Search or type a custom location, then press Enter</span>
          </div>

          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {showAddCustom && (
              <button
                type="button"
                onClick={() => addLocation(query.trim())}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-primary hover:bg-primary/5"
              >
                <Plus size={13} /> Add "{query.trim()}"
              </button>
            )}
            {filtered.length === 0 && !showAddCustom ? (
              <div className="p-3 text-center text-xs text-gray-400">
                {value.length > 0 ? 'All matching locations already added.' : 'No matching locations.'}
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => addLocation(opt.value)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <span>{opt.label}</span>
                  {opt.group && <span className="text-[10px] text-gray-400">{opt.group}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationMultiSelect;
