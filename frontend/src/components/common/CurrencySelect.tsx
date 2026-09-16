import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { CurrencyOption } from '../employer/employerApi/api';

interface CurrencySelectProps {
  value: string;
  currencies: CurrencyOption[];
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Searchable currency dropdown — code + symbol + name, filterable by any
 * of the three. Built as a plain filtered listbox (no combobox library):
 * the option set is small (~40 entries) and entirely in memory once
 * fetched, so a debounced server search would be overkill — same
 * reasoning CompanySearchInput.tsx documents for its own pattern, just
 * without the network round trip since there's nothing to look up remotely.
 */
export const CurrencySelect: React.FC<CurrencySelectProps> = ({
  value,
  currencies,
  onChange,
  className = '',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => currencies.find((c) => c.code === value), [currencies, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return currencies;
    return currencies.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [currencies, query]);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            <span className="font-semibold text-gray-700">{selected.symbol}</span>
            <span>{selected.code}</span>
            <span className="truncate text-gray-400">— {selected.name}</span>
          </span>
        ) : (
          <span className="text-gray-400">{value || 'Select currency'}</span>
        )}
        <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="relative border-b border-gray-100 p-2">
            <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code, symbol, or name…"
              className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <ul role="listbox" className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-400">No matching currency.</li>
            )}
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === value}
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    c.code === value ? 'bg-primary/5 text-primary' : 'text-gray-700'
                  }`}
                >
                  <span className="w-8 shrink-0 text-center font-semibold text-gray-500">{c.symbol}</span>
                  <span className="font-medium">{c.code}</span>
                  <span className="truncate text-gray-400">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CurrencySelect;
